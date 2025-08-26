import { sequelize } from "../config/database";
import bcrypt from "bcryptjs";
import * as cartService from "./cartService";
import { IUserAttributes } from "../models/User";
import { QueryTypes } from "sequelize";

export interface UserInsertDTO {
  email: string;
  password: string;
  role?: "Admin" | "User";
  cartId?: number | null;
}

// Let's use a raw query with the correct column names
export async function findUserByEmail(
  email: string
): Promise<IUserAttributes | undefined> {
  try {
    const result = (await sequelize.query(
      `SELECT 
        "Email" as "email",
        "Password" as "password",
        "Role" as "role",
        "Salt" as "salt",
        "CartId" as "cartId"
      FROM "Users" 
      WHERE "Email" = :email 
      LIMIT 1`,
      {
        replacements: { email },
        type: "SELECT",
        plain: true,
      }
    )) as unknown as IUserAttributes;

    if (!result || Object.keys(result).length === 0) return undefined;

    const user = {
      ...result,
      // Make sure the salt is a Buffer
      salt: Buffer.isBuffer(result.salt)
        ? result.salt
        : Buffer.from(result.salt, "utf8"),
    };

    console.log("User from DB:", {
      ...user,
      salt: "<Buffer>",
    });

    return user;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new Error("Failed to find user");
  }
}

export async function createUser(
  userInsertDTO: UserInsertDTO
): Promise<IUserAttributes> {
  if (!userInsertDTO.email || !userInsertDTO.password) {
    throw new Error("Email and password are required");
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(userInsertDTO.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userInsertDTO.password, salt);
  const role: "Admin" | "User" =
    userInsertDTO.role === "Admin" ? "Admin" : "User";
  
  const email = userInsertDTO.email;
  let cartId = userInsertDTO.cartId || null;

  // We'll create the cart after the user is created
  // to ensure the user exists first
  cartId = 0; // Default value to satisfy NOT NULL constraint
  
  // Start a transaction for user creation
  const transaction = await sequelize.transaction();
  
  try {
    // Insert user with cart ID
    await sequelize.query(
      `INSERT INTO "Users" (
        "Email", 
        "Password", 
        "Salt", 
        "Role",
        "CartId"
      ) VALUES (
        :email, 
        :password, 
        :salt, 
        :role,
        :cartId
      )`,
      {
        replacements: {
          email,
          password: hashedPassword,
          salt,
          role,
          cartId: cartId || 0 // Ensure we never pass null
        },
        type: 'INSERT' as const,
        transaction
      }
    );

    // Commit the user creation
    await transaction.commit();
    
    // Now that user is created, create their cart
    try {
      const cart = await cartService.createCart(email, true);
      const newCartId = cart?.IdCart;
      
      // Update user with the new cart ID if creation was successful
      if (newCartId) {
        await sequelize.query(
          'UPDATE "Users" SET "CartId" = :newCartId WHERE "Email" = :email',
          {
            replacements: { newCartId, email },
            type: 'UPDATE' as const,
          }
        );
        cartId = newCartId;
      }
    } catch (cartError) {
      console.error('Error creating cart for user after registration:', email, cartError);
      // User was created successfully, so we can continue without a cart
      // The user can create a cart later when needed
    }

    // Return user data
    return {
      email: email,
      password: hashedPassword,
      role: role,
      salt: Buffer.from(salt, 'utf8'),
      cartId: cartId,
    };
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error("Error creating user:", error);
    throw error instanceof Error 
      ? error 
      : new Error("Failed to create user");
  }
}

export async function getAllUsers(): Promise<
  Array<{ email: string; role: string; cartId: number }>
> {
  try {
    const results = (await sequelize.query(
      'SELECT "Email" as "email", "Role" as "role", "CartId" as "cartId" FROM "Users"',
      {
        type: QueryTypes.SELECT,
        mapToModel: false,
      }
    )) as Array<{ email: string; role: string; cartId: number }>;

    return results;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function deleteUser(email: string): Promise<boolean> {
  if (!email) {
    throw new Error("Email is required");
  }

  const transaction = await sequelize.transaction();

  try {
    // First, find the user to get their ID
    const user = await findUserByEmail(email);
    if (!user) {
      await transaction.rollback();
      return false;
    }

    // Delete associated orders
    await sequelize.query('DELETE FROM "Orders" WHERE "UserEmail" = :email', {
      replacements: { email },
      type: "DELETE",
      transaction,
    });

    // Delete the user (no depender de RETURNING por inconsistencias entre drivers)
    await sequelize.query('DELETE FROM "Users" WHERE "Email" = :email', {
      replacements: { email },
      type: "DELETE",
      transaction,
    });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
}

export async function updateLastLogin(userId: number): Promise<void> {
  await sequelize.query(
    'UPDATE "Users" SET "lastLogin" = NOW() WHERE "Email" = :email',
    {
      replacements: { email: String(userId) },
      type: "UPDATE" as const,
    }
  );
}

export default {
  findUserByEmail,
  createUser,
  getAllUsers,
  deleteUser,
  updateLastLogin,
};
