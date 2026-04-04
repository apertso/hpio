import db from "../models";
import { FundSnapshotInstance } from "../models/FundSnapshot";
import { Op } from "sequelize";

export const getSnapshotByDate = async (
  userId: string,
  snapshotDate: string
): Promise<FundSnapshotInstance | null> => {
  return await db.FundSnapshot.findOne({
    where: { userId, snapshotDate },
  });
};

export const getSnapshots = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<FundSnapshotInstance[]> => {
  return await db.FundSnapshot.findAll({
    where: {
      userId,
      snapshotDate: {
        [Op.between]: [startDate, endDate],
      },
    },
    order: [["snapshotDate", "ASC"]],
  });
};

export const createSnapshot = async (
  userId: string,
  snapshotDate: string,
  totalUsd: number
): Promise<FundSnapshotInstance> => {
  return await db.FundSnapshot.create({
    userId,
    snapshotDate,
    totalUsd,
  });
};
