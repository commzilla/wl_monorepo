from django_hosts import patterns, host


host_patterns = patterns('',  # empty string if using absolute imports
    host(r'admin', 'backend.urls', name='admin'),
    host(r'api', 'api.urls', name='api'),
)


