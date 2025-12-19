import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface BlogPostAttributes {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPostCreationAttributes
  extends Optional<
    BlogPostAttributes,
    "id" | "excerpt" | "published" | "createdAt" | "updatedAt"
  > {}

export interface BlogPostInstance
  extends Model<BlogPostAttributes, BlogPostCreationAttributes>,
    BlogPostAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const BlogPost = sequelize.define<BlogPostInstance, BlogPostCreationAttributes>(
    "BlogPost",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      slug: {
        type: dataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: dataTypes.TEXT,
        allowNull: false,
      },
      excerpt: {
        type: dataTypes.TEXT,
        allowNull: true,
      },
      published: {
        type: dataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      createdAt: {
        type: dataTypes.DATE,
        defaultValue: dataTypes.NOW,
      },
      updatedAt: {
        type: dataTypes.DATE,
        defaultValue: dataTypes.NOW,
      },
    },
    {
      tableName: "blog_posts",
      indexes: [
        {
          unique: true,
          fields: ["slug"],
        },
        {
          fields: ["published", "createdAt"],
        },
      ],
    }
  );

  return BlogPost;
};


