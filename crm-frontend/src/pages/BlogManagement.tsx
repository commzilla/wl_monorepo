import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BlogPostList from '@/components/blog/BlogPostList';
import BlogCategoryManager from '@/components/blog/BlogCategoryDialog';
import BlogTagManager from '@/components/blog/BlogTagDialog';

const BlogManagement: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Blog Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Create, manage, and publish blog posts for the WeFund website.</p>
      </div>

      <Tabs defaultValue="posts">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="posts" className="mt-4">
          <BlogPostList onNewPost={() => navigate('/blog/new')} />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <BlogCategoryManager />
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <BlogTagManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogManagement;
