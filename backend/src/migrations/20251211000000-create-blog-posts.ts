import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = { schema: "dbo", tableName: "blog_posts" };

    await queryInterface.createTable(table, {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex(table, ["slug"], {
      unique: true,
      name: "blog_posts_slug_unique",
    });
    await queryInterface.addIndex(table, ["published", "createdAt"], {
      name: "blog_posts_published_createdAt_idx",
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const table = { schema: "dbo", tableName: "blog_posts" };
    await queryInterface.dropTable(table);
  },
};
