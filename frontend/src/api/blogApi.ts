import axiosInstance from "./axiosInstance";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content?: string;
  excerpt?: string | null;
  createdAt: string;
}

export const blogApi = {
  async getBlogPosts(): Promise<BlogPost[]> {
    const response = await axiosInstance.get<BlogPost[]>("/blog");
    return response.data;
  },
  async getBlogPost(slug: string): Promise<BlogPost> {
    const response = await axiosInstance.get<BlogPost>(`/blog/${slug}`);
    return response.data;
  },
};


