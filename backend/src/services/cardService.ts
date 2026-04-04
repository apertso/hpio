import db from "../models";
import axios from "axios";
import logger from "../config/logger";

export const createCard = async (userId: string, data: any) => {
  return await db.Card.create({ ...data, userId });
};

export const getCards = async (userId: string) => {
  return await db.Card.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    include: [{ model: db.CardBalance, as: "balances" }],
  });
};

export const getCard = async (cardId: string, userId: string) => {
  return await db.Card.findOne({
    where: { id: cardId, userId },
    include: [{ model: db.CardBalance, as: "balances" }],
  });
};

export const updateCard = async (cardId: string, userId: string, data: any) => {
  const card = await db.Card.findOne({ where: { id: cardId, userId } });
  if (!card) throw new Error("Card not found");
  return await card.update(data);
};

export const deleteCard = async (cardId: string, userId: string) => {
  const card = await db.Card.findOne({ where: { id: cardId, userId } });
  if (!card) throw new Error("Card not found");
  await card.destroy();
  return true;
};

export const lookupBin = async (bin: string) => {
  try {
    // Only first 6 digits matter
    const cleanBin = bin.replace(/\D/g, "").slice(0, 6);
    if (cleanBin.length < 6) return null;

    // Proxy to binsapi
    const response = await axios.get(`https://binsapi.vercel.app/api/bin?bin=${cleanBin}`);
    return response.data;
  } catch (error) {
    logger.error("BIN lookup failed", error);
    // Return null mostly, don't crash
    return null;
  }
};

