"""
Blog Admin Views.

CRM-facing CRUD endpoints for managing blog posts, categories, and tags.
Admin endpoints use HasPermission with RBAC; public endpoints use AllowAny.
"""

import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django_filters.rest_framework import DjangoFilterBackend

from api.permissions import HasPermission
from wefund.models import BlogPost, BlogCategory, BlogTag
from api.serializers import (
    BlogPostAdminSerializer,
    BlogCategoryAdminSerializer,
    BlogTagAdminSerializer,
)

logger = logging.getLogger(__name__)


class BlogPostPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class BlogPostAdminViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for blog posts.
    GET /api/admin/blog/posts/
    POST /api/admin/blog/posts/
    GET /api/admin/blog/posts/{id}/
    PUT/PATCH /api/admin/blog/posts/{id}/
    DELETE /api/admin/blog/posts/{id}/
    POST /api/admin/blog/posts/{id}/publish/
    POST /api/admin/blog/posts/{id}/unpublish/
    """
    queryset = BlogPost.objects.select_related('category', 'author').prefetch_related('tags').all()
    serializer_class = BlogPostAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['blog.manage']
    pagination_class = BlogPostPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category']
    search_fields = ['title', 'excerpt', 'content']
    ordering_fields = ['created_at', 'published_at', 'title', 'status']
    ordering = ['-created_at']

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = 'published'
        if not post.published_at:
            post.published_at = timezone.now()
        if not post.author_display_name and post.author:
            name = f"{post.author.first_name} {post.author.last_name}".strip()
            post.author_display_name = name or post.author.username
        post.save()
        return Response(BlogPostAdminSerializer(post).data)

    @action(detail=True, methods=['post'], url_path='unpublish')
    def unpublish(self, request, pk=None):
        post = self.get_object()
        post.status = 'draft'
        post.save()
        return Response(BlogPostAdminSerializer(post).data)


class BlogCategoryAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for blog categories."""
    queryset = BlogCategory.objects.all()
    serializer_class = BlogCategoryAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['blog.manage']
    filter_backends = [SearchFilter]
    search_fields = ['name']
    pagination_class = None


class BlogTagAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for blog tags."""
    queryset = BlogTag.objects.all()
    serializer_class = BlogTagAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['blog.manage']
    filter_backends = [SearchFilter]
    search_fields = ['name']
    pagination_class = None


# ==========================================
# Public Blog Endpoints
# ==========================================

from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from api.serializers import (
    BlogPostListPublicSerializer,
    BlogPostDetailPublicSerializer,
    BlogCategoryPublicSerializer,
)


class BlogPostPublicPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50


class BlogPostPublicListView(generics.ListAPIView):
    """
    GET /api/website/blog/posts/
    Returns published blog posts with optional category/search filtering.
    """
    serializer_class = BlogPostListPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = BlogPostPublicPagination

    def get_queryset(self):
        qs = BlogPost.objects.filter(status='published').select_related('category')
        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(title__icontains=search)
        return qs


class BlogPostPublicDetailView(generics.RetrieveAPIView):
    """
    GET /api/website/blog/posts/<slug>/
    Returns a single published blog post by slug.
    """
    serializer_class = BlogPostDetailPublicSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return BlogPost.objects.filter(status='published').select_related('category').prefetch_related('tags')


class BlogCategoryPublicListView(generics.ListAPIView):
    """
    GET /api/website/blog/categories/
    Returns active categories with post counts.
    """
    serializer_class = BlogCategoryPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return BlogCategory.objects.filter(is_active=True)


class BlogSitemapView(APIView):
    """
    GET /api/website/blog/sitemap.xml
    Returns XML sitemap for all published blog posts.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.http import HttpResponse

        posts = BlogPost.objects.filter(status='published').order_by('-published_at')
        base_url = 'https://we-fund.com'

        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            f'  <url><loc>{base_url}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>',
        ]

        for post in posts:
            lastmod = post.updated_at.strftime('%Y-%m-%d') if post.updated_at else ''
            xml_lines.append(
                f'  <url>'
                f'<loc>{base_url}/blog/{post.slug}</loc>'
                f'<lastmod>{lastmod}</lastmod>'
                f'<changefreq>weekly</changefreq>'
                f'<priority>0.7</priority>'
                f'</url>'
            )

        xml_lines.append('</urlset>')
        xml_content = '\n'.join(xml_lines)

        return HttpResponse(xml_content, content_type='application/xml')
