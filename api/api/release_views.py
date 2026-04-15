"""
Release & Git Log Views.

CRM-facing endpoints for managing release notes and viewing git commit history.
All endpoints require the 'system.view_releases' permission.
"""

import logging

import requests as http_requests
from django.conf import settings as django_settings
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import HasPermission
from wefund.models import Release
from api.serializers import ReleaseSerializer, ReleaseListSerializer

logger = logging.getLogger(__name__)

GITHUB_REPOS = {
    'api': 'wefund-api',
    'crm': 'wefund-crm-frontend',
    'app': 'wefund-frontend',
    'website': 'wefund',
}

GITHUB_API_BASE = 'https://api.github.com'

GIT_LOG_CACHE_TTL = 300  # 5 minutes
MAX_COMMITS_PER_REPO = 500
MAX_PAGE_SIZE = 200


class ReleasePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ReleaseViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for release notes.
    GET    /api/admin/releases/
    POST   /api/admin/releases/
    GET    /api/admin/releases/{id}/
    PUT    /api/admin/releases/{id}/
    PATCH  /api/admin/releases/{id}/
    DELETE /api/admin/releases/{id}/
    """
    queryset = Release.objects.select_related('created_by').all()
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = ['system.view_releases']
    pagination_class = ReleasePagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'version']
    ordering_fields = ['release_date', 'created_at']
    ordering = ['-release_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return ReleaseListSerializer
        return ReleaseSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class GitLogView(APIView):
    """
    GET /api/admin/git-log/?repo=api&page=1&page_size=50

    Returns paginated git commit history from GitHub API.
    When no repo filter is specified, merges commits from all repos sorted by date.
    """
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = ['system.view_releases']

    def get(self, request):
        repo_filter = request.query_params.get('repo', '')
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(int(request.query_params.get('page_size', 50)), MAX_PAGE_SIZE)

        repos_to_query = {}
        if repo_filter and repo_filter in GITHUB_REPOS:
            repos_to_query[repo_filter] = GITHUB_REPOS[repo_filter]
        else:
            repos_to_query = GITHUB_REPOS

        all_commits = []
        for repo_name, github_repo in repos_to_query.items():
            commits = self._get_repo_commits(repo_name, github_repo)
            all_commits.extend(commits)

        # Sort by date descending
        all_commits.sort(key=lambda c: c['date'], reverse=True)

        # Paginate
        total = len(all_commits)
        start = (page - 1) * page_size
        end = start + page_size
        page_commits = all_commits[start:end]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if total else 0,
            'results': page_commits,
        })

    def _get_repo_commits(self, repo_name, github_repo):
        cache_key = f"git_log_{repo_name}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        token = getattr(django_settings, 'GITHUB_TOKEN', '')
        org = getattr(django_settings, 'GITHUB_ORG', 'commzilla')

        if not token:
            logger.error("GITHUB_TOKEN not configured, cannot fetch commits for %s", repo_name)
            return []

        try:
            commits = []
            per_page = 100  # GitHub max per page
            pages_needed = (MAX_COMMITS_PER_REPO + per_page - 1) // per_page

            headers = {
                'Authorization': f'token {token}',
                'Accept': 'application/vnd.github.v3+json',
            }

            for api_page in range(1, pages_needed + 1):
                url = f'{GITHUB_API_BASE}/repos/{org}/{github_repo}/commits'
                params = {
                    'sha': 'main',
                    'per_page': per_page,
                    'page': api_page,
                }

                resp = http_requests.get(url, headers=headers, params=params, timeout=10)

                if resp.status_code != 200:
                    logger.error(
                        "GitHub API error for %s: %s %s",
                        repo_name, resp.status_code, resp.text[:200]
                    )
                    break

                data = resp.json()
                if not data:
                    break

                for item in data:
                    commit_data = item.get('commit', {})
                    author_data = commit_data.get('author', {})
                    commits.append({
                        'hash': item.get('sha', ''),
                        'short_hash': item.get('sha', '')[:7],
                        'subject': commit_data.get('message', '').split('\n')[0],
                        'date': author_data.get('date', ''),
                        'author': author_data.get('name', ''),
                        'repo': repo_name,
                    })

                if len(data) < per_page:
                    break

            cache.set(cache_key, commits, GIT_LOG_CACHE_TTL)
            return commits

        except http_requests.RequestException as exc:
            logger.error("GitHub API request failed for %s: %s", repo_name, exc)
            return []
        except Exception as exc:
            logger.error("GitHub API error for %s: %s", repo_name, exc)
            return []
