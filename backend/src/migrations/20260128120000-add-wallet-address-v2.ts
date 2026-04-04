import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const cryptoBalancesTable = { schema: "dbo", tableName: "crypto_balances" };
    
    await queryInterface.addColumn(cryptoBalancesTable, "walletAddress", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const cryptoBalancesTable = { schema: "dbo", tableName: "crypto_balances" };
    
    await queryInterface.removeColumn(cryptoBalancesTable, "walletAddress");
  },
};
