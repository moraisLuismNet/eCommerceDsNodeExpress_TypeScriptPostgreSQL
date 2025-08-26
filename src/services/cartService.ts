import { sequelize } from "../config/database";
import { Sequelize, QueryTypes, Transaction } from "sequelize";
import dotenv from "dotenv";
import cartDetailService from "./cartDetailService";
import recordService from "./recordService";

interface Cart {
  IdCart: number;
  UserEmail: string;
  TotalPrice: number;
  Enabled: boolean;
}

interface CartRow extends Cart {
  [key: string]: any;
}

import { CartDetail } from "./cartDetailService";

interface CartItemWithDetails extends CartDetail {
  Record?: {
    IdRecord: number;
    TitleRecord: string;
    ImageRecord: string;
  };
}

interface CartWithDetails extends Cart {
  items: CartItemWithDetails[];
}

export interface CartStatusDTO {
  Enabled: boolean;
}

export async function getCartStatus(email: string): Promise<CartStatusDTO> {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const cart = await sequelize.query<Cart>(
      'SELECT "Enabled" FROM "Carts" WHERE "UserEmail" = :email LIMIT 1',
      {
        replacements: { email: normalizedEmail },
        type: QueryTypes.SELECT,
      }
    );
    
    return {
      Enabled: cart.length > 0 ? cart[0].Enabled : false
    };
  } catch (error) {
    console.error('Error in getCartStatus:', error);
    throw new Error('Failed to get cart status');
  }
}

export async function getActiveCartByEmail(
  email: string
): Promise<Cart | null> {
  if (!email) {
    console.error('[getActiveCartByEmail] No email provided');
    throw new Error('Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  console.log(`[getActiveCartByEmail] Getting active cart for: ${normalizedEmail}`);
  
  try {
    // First try exact match (case sensitive)
    console.log(`[getActiveCartByEmail] Trying exact match for: ${normalizedEmail}`);
    const exactMatchResult = await sequelize.query<Cart>(
      'SELECT * FROM "Carts" WHERE "UserEmail" = :email AND "Enabled" = true LIMIT 1',
      {
        replacements: { email: normalizedEmail },
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    if (exactMatchResult && exactMatchResult.IdCart) {
      console.log(`[getActiveCartByEmail] Found cart with exact email match, ID: ${exactMatchResult.IdCart}`);
      return exactMatchResult;
    }

    // If no exact match, try case-insensitive search
    console.log(`[getActiveCartByEmail] No exact match, trying case-insensitive search for: ${normalizedEmail}`);
    const result = await sequelize.query<Cart>(
      'SELECT * FROM "Carts" WHERE LOWER(TRIM("UserEmail")) = :email AND "Enabled" = true LIMIT 1',
      {
        replacements: { email: normalizedEmail },
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    if (!result || !result.IdCart) {
      console.log(`[getActiveCartByEmail] No active cart found for: ${normalizedEmail}`);
      return null;
    }
    
    console.log(`[getActiveCartByEmail] Found cart with case-insensitive match, ID: ${result.IdCart}`);
    return result;
  } catch (error) {
    console.error(`[getActiveCartByEmail] Error getting cart for ${normalizedEmail}:`, error);
    throw error;
  }
}

export async function getCartById(id: number): Promise<Cart | null> {
  try {
    const result = await sequelize.query<Cart>(
      'SELECT * FROM "Carts" WHERE "IdCart" = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT,
        plain: true
      }
    ) as unknown as Cart;
    
    if (!result || !result.IdCart) {
      console.log(`[getCartById] No cart found with ID: ${id}`);
      return null;
    }
    
    console.log(`[getCartById] Found cart with ID: ${result.IdCart}`);
    return result;
  } catch (error) {
    console.error(`[getCartById] Error fetching cart with ID ${id}:`, error);
    throw error;
  }
}

export async function createCart(
  userEmail: string,
  enabled = true,
  transaction?: Transaction
): Promise<Cart> {
  const normalizedEmail = userEmail.trim().toLowerCase();
  console.log(`[createCart] Creating cart for: ${normalizedEmail}`);
  
  // First verify the user exists
  const [user] = await sequelize.query(
    'SELECT "Email" FROM "Users" WHERE "Email" = :email',
    {
      replacements: { email: normalizedEmail },
      type: 'SELECT' as const,
    }
  );
  
  if (!user) {
    const error = new Error(`User ${normalizedEmail} not found`);
    (error as any).code = 'USER_NOT_FOUND';
    throw error;
  }
  
  // Then check if cart exists outside transaction to avoid unnecessary transactions
  const existingCart = await getActiveCartByEmail(normalizedEmail);
  if (existingCart) {
    console.log(`[createCart] Cart already exists for ${normalizedEmail}, ID: ${existingCart.IdCart}`);
    
    // If existing cart has a non-zero total but no items, reset it to 0
    if (parseFloat(existingCart.TotalPrice.toString()) > 0) {
      const cartDetails = await cartDetailService.getCartDetailsByCartId(existingCart.IdCart);
      if (cartDetails.length === 0) {
        console.log(`[createCart] Found cart with non-zero total but no items, resetting total to 0`);
        await sequelize.query(
          'UPDATE "Carts" SET "TotalPrice" = 0 WHERE "IdCart" = :cartId',
          {
            replacements: { cartId: existingCart.IdCart },
            type: 'UPDATE' as const,
          }
        );
        existingCart.TotalPrice = 0;
      }
    }
    
    return existingCart;
  }
  
  // If we get here, we need to create a new cart
  console.log(`[createCart] No active cart found for ${normalizedEmail}, attempting to create one`);
  
  try {
    // Try to create the cart with a simple INSERT first
    const [results] = await sequelize.query(
      'INSERT INTO "Carts" ("UserEmail", "TotalPrice", "Enabled") VALUES (:email, 0, :enabled) ON CONFLICT ("UserEmail") DO UPDATE SET "Enabled" = EXCLUDED."Enabled", "TotalPrice" = 0 RETURNING "IdCart", "UserEmail", "TotalPrice", "Enabled"',
      {
        replacements: {
          email: normalizedEmail,
          enabled: true
        },
        type: 'INSERT' as const,
      }
    );
    
    // If we get here, the cart was either created or already existed
    const cart = results[0] as Cart;
    console.log(`[createCart] Successfully created/retrieved cart ${cart.IdCart} for ${normalizedEmail} with total: ${cart.TotalPrice}`);
    return cart;
    
  } catch (error: any) {
    // If we get a unique constraint error, it means the cart was created by another request
    if (error.code === '23505' || error.name === 'SequelizeUniqueConstraintError') {
      console.log(`[createCart] Race condition detected, fetching existing cart for ${normalizedEmail}`);
      
      // Try to get the cart that was just created by another request
      const existingCart = await getActiveCartByEmail(normalizedEmail);
      if (existingCart) {
        console.log(`[createCart] Found cart created by another process:`, existingCart.IdCart);
        return existingCart;
      }
      
      // If we can't find the cart, something else went wrong
      console.error(`[createCart] Could not find cart after race condition for ${normalizedEmail}`, error);
      const notFoundError = new Error('Failed to find cart after race condition');
      (notFoundError as any).code = 'CART_NOT_FOUND_AFTER_RACE';
      throw notFoundError;
    }
    
    // For all other errors, log and re-throw
    console.error(`[createCart] Error creating cart for ${normalizedEmail}:`, error);
    throw error;
  }
}

export async function updateCartTotalPrice(
  cartId: number,
  priceToAdd: number
): Promise<void> {
  const cart = await getCartById(cartId);
  if (!cart) throw new Error("Cart not found");

  // Ensure values are numbers
  const currentTotal = typeof cart.TotalPrice === 'number' ? cart.TotalPrice : parseFloat(cart.TotalPrice) || 0;
  const newTotalPrice = currentTotal + (typeof priceToAdd === 'number' ? priceToAdd : parseFloat(priceToAdd) || 0);
  
  await sequelize.query(
    'UPDATE "Carts" SET "TotalPrice" = :newTotalPrice WHERE "IdCart" = :cartId',
    {
      replacements: { 
        newTotalPrice: newTotalPrice.toFixed(2), // Ensure 2 decimal places
        cartId 
      },
      type: "UPDATE" as const,
    }
  );
}

export async function disableCart(email: string): Promise<number> {
  // First try to get any cart for this email, regardless of status
  let cart = await getCartByEmail(email);
  
  // If no cart exists, try to get an active cart (for backward compatibility)
  if (!cart) {
    cart = await getActiveCartByEmail(email);
  }
  
  if (!cart) throw new Error("No cart found for this user");

  const cartDetails = await cartDetailService.getCartDetailsByCartId(
    cart.IdCart
  );

  // Return stock for all items in the cart
  for (const detail of cartDetails) {
    await recordService.updateStock(detail.RecordId, detail.Amount);
  }

  // Disable the cart if it's not already disabled
  if (cart.Enabled) {
    await sequelize.query(
      'UPDATE "Carts" SET "Enabled" = false WHERE "IdCart" = :cartId',
      {
        replacements: { cartId: cart.IdCart },
        type: "UPDATE" as const,
      }
    );
  }

  return cart.IdCart;
}

export async function enableCart(email: string): Promise<Cart> {
  const [results] = await sequelize.query(
    'UPDATE "Carts" SET "Enabled" = true WHERE "UserEmail" = :email AND "Enabled" = false RETURNING *',
    {
      replacements: { email },
      type: "UPDATE" as const,
    }
  );

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No disabled cart found for this user to enable");
  }

  return results[0] as Cart;
}

export async function getActiveCartWithDetails(
  email: string
): Promise<CartWithDetails | null> {
  const cart = await getActiveCartByEmail(email);
  if (!cart) return null;

  const cartDetails = await cartDetailService.getCartDetailsByCartId(
    cart.IdCart
  );

  // For now, just return the basic cart details without Record info
  // You'll need to join with the Records table if you want to include Record details
  return {
    ...cart,
    items: cartDetails,
  };
}

export async function getCartByEmail(email: string): Promise<Cart | null> {
  const normalizedEmail = email.trim().toLowerCase();
  console.log(`[getCartByEmail] Getting cart for: ${normalizedEmail}`);
  
  try {
    // First try exact match (case sensitive)
    const [exactMatch] = await sequelize.query<CartRow>(
      'SELECT * FROM "Carts" WHERE "UserEmail" = :email LIMIT 1',
      {
        replacements: { email: normalizedEmail },
        type: QueryTypes.SELECT,
        plain: false
      }
    ) as [CartRow, unknown];

    if (exactMatch) {
      console.log(`[getCartByEmail] Found cart with exact email match, ID: ${exactMatch.IdCart}, Enabled: ${exactMatch.Enabled}`);
      return exactMatch;
    }

    // If no exact match, try case-insensitive search
    console.log(`[getCartByEmail] No exact match, trying case-insensitive search`);
    const [result] = await sequelize.query<CartRow>(
      'SELECT * FROM "Carts" WHERE LOWER(TRIM("UserEmail")) = :email LIMIT 1',
      {
        replacements: { email: normalizedEmail },
        type: QueryTypes.SELECT,
        plain: false
      }
    ) as [CartRow, unknown];
    
    if (!result) {
      console.log(`[getCartByEmail] No cart found for: ${normalizedEmail}`);
      return null;
    }
    
    console.log(`[getCartByEmail] Found cart with case-insensitive match, ID: ${result.IdCart}, Enabled: ${result.Enabled}`);
    return result;
  } catch (error) {
    console.error('[getCartByEmail] Error:', error);
    throw error;
  }
}

export async function getAllCarts(): Promise<Cart[]> {
  const results = await sequelize.query<CartRow>(
    'SELECT * FROM "Carts" WHERE "Enabled" = true ORDER BY "IdCart" DESC',
    { 
      type: QueryTypes.SELECT 
    }
  );
  return results as CartRow[];
}

// Export all functions as named exports
export default {
  getActiveCartByEmail,
  getCartById,
  getCartStatus,
  createCart,
  getAllCarts,
  updateCartTotalPrice,
  disableCart,
  enableCart,
  getActiveCartWithDetails,
  getCartByEmail
};
