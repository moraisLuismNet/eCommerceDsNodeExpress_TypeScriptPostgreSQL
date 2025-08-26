import { sequelize } from "../config/database";
import { QueryTypes } from "sequelize";

export interface RecordItem {
  IdRecord?: number;
  TitleRecord: string;
  YearOfPublication: number;
  ImageRecord: string;
  Price: number;
  Stock: number;
  Discontinued: boolean;
  GroupId: number;
  NameGroup?: string;
}

export async function getAll(): Promise<RecordItem[]> {
  const results = await sequelize.query(
    `
    SELECT 
      r."IdRecord", 
      r."TitleRecord", 
      r."YearOfPublication", 
      r."ImageRecord", 
      r."Price", 
      r."Stock", 
      r."Discontinued", 
      r."GroupId", 
      g."NameGroup" 
    FROM "Records" r
    LEFT JOIN "Groups" g ON r."GroupId" = g."IdGroup"
  `,
    { type: "SELECT" }
  );

  return results as RecordItem[];
}

export async function getById(id: number): Promise<RecordItem | null> {
  const results = await sequelize.query(
    'SELECT * FROM "Records" WHERE "IdRecord" = :id',
    {
      replacements: { id },
      type: QueryTypes.SELECT,
    }
  );
  return (results as RecordItem[])[0] || null;
}

export async function create(
  recordData: Omit<RecordItem, "IdRecord" | "NameGroup">
): Promise<{ IdRecord: number } & Omit<RecordItem, "IdRecord" | "NameGroup">> {
  const [results] = await sequelize.query(
    `INSERT INTO "Records" 
     ("TitleRecord", "YearOfPublication", "ImageRecord", "Price", "Stock", "Discontinued", "GroupId") 
     VALUES (:title, :year, :image, :price, :stock, :discontinued, :groupId) 
     RETURNING "IdRecord"`,
    {
      replacements: {
        title: recordData.TitleRecord,
        year: recordData.YearOfPublication,
        image: recordData.ImageRecord,
        price: recordData.Price,
        stock: recordData.Stock,
        discontinued: recordData.Discontinued,
        groupId: recordData.GroupId,
      },
      type: "INSERT" as const,
    }
  );

  const insertedId = (results as any)[0].IdRecord;
  return { IdRecord: insertedId, ...recordData };
}

export async function update(
  id: number,
  recordData: Partial<Omit<RecordItem, "IdRecord" | "NameGroup">>
): Promise<boolean> {
  const fields = [];
  const replacements: { [key: string]: any } = { id };

  if (recordData.TitleRecord !== undefined) {
    fields.push('"TitleRecord" = :title');
    replacements.title = recordData.TitleRecord;
  }
  if (recordData.YearOfPublication !== undefined) {
    fields.push('"YearOfPublication" = :year');
    replacements.year = recordData.YearOfPublication;
  }
  if (recordData.ImageRecord !== undefined) {
    fields.push('"ImageRecord" = :image');
    replacements.image = recordData.ImageRecord;
  }
  if (recordData.Price !== undefined) {
    fields.push('"Price" = :price');
    replacements.price = recordData.Price;
  }
  if (recordData.Stock !== undefined) {
    fields.push('"Stock" = :stock');
    replacements.stock = recordData.Stock;
  }
  if (recordData.Discontinued !== undefined) {
    fields.push('"Discontinued" = :discontinued');
    replacements.discontinued = recordData.Discontinued;
  }
  if (recordData.GroupId !== undefined) {
    fields.push('"GroupId" = :groupId');
    replacements.groupId = recordData.GroupId;
  }

  if (fields.length === 0) return false;

  const query = `
    UPDATE "Records" 
    SET ${fields.join(", ")}
    WHERE "IdRecord" = :id
  `;

  const [_, rowCount] = await sequelize.query(query, {
    replacements,
    type: "UPDATE" as const,
  });

  return (rowCount as number) > 0;
}

export async function remove(id: number): Promise<boolean> {
  // Check if record exists
  const existing = await getById(id);
  if (!existing) {
    return false;
  }
  await sequelize.query('DELETE FROM "Records" WHERE "IdRecord" = :id', {
    replacements: { id },
    type: "DELETE" as const,
  });
  return true;
}

export async function updateStock(
  id: number,
  amount: number
): Promise<{ newStock: number }> {
  const record = await getById(id);
  if (!record) {
    throw new Error(`Record with ID ${id} not found`);
  }

  if (amount < 0 && Math.abs(amount) > record.Stock) {
    throw new Error("The decrease cannot be greater than the available stock");
  }

  const newStock = record.Stock + amount;

  await sequelize.query(
    'UPDATE "Records" SET "Stock" = :newStock WHERE "IdRecord" = :id',
    {
      replacements: { newStock, id },
      type: "UPDATE" as const,
    }
  );

  return { newStock };
}

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  updateStock,
};
