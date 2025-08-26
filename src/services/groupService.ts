import { sequelize } from "../config/database";
import { QueryTypes } from 'sequelize';

export interface Group {
  IdGroup?: number;
  NameGroup: string;
  ImageGroup: string | null;
  MusicGenreId: number;
  NameMusicGenre?: string;
  TotalRecords?: number;
}

export interface GroupWithRecords extends Group {
  Records?: Array<{
    IdRecord: number;
    TitleRecord: string;
    YearOfPublication: number;
    ImageRecord: string;
    Price: number;
    Stock: number;
  }>;
}

export async function getAll(): Promise<Group[]> {
  const results = await sequelize.query(`
    SELECT 
      g."IdGroup", 
      g."NameGroup", 
      g."ImageGroup", 
      g."MusicGenreId", 
      mg."NameMusicGenre",
      (SELECT COUNT(*) FROM "Records" r WHERE r."GroupId" = g."IdGroup") as "TotalRecords"
    FROM "Groups" g
    LEFT JOIN "MusicGenres" mg ON g."MusicGenreId" = mg."IdMusicGenre"
  `, { type: 'SELECT' });
  
  return results as Group[];
}

export async function getById(id: number): Promise<Group | null> {
  const [result] = await sequelize.query(
    `SELECT g.*, mg."NameMusicGenre" 
     FROM "Groups" g 
     LEFT JOIN "MusicGenres" mg ON g."MusicGenreId" = mg."IdMusicGenre" 
     WHERE g."IdGroup" = :id`,
    {
      replacements: { id },
      type: QueryTypes.SELECT
    }
  ) as any[];
  return result || null;
}

export async function getRecordsByGroupId(id: number): Promise<GroupWithRecords | null> {
  const group = await getById(id);
  if (!group) return null;

  const records = await sequelize.query(
    'SELECT "IdRecord", "TitleRecord", "YearOfPublication", "ImageRecord", "Price", "Stock" FROM "Records" WHERE "GroupId" = :groupId',
    {
      replacements: { groupId: id },
      type: QueryTypes.SELECT
    }
  ) as any[];

  return {
    ...group,
    Records: records
  };
}

export async function create(groupData: Omit<Group, 'IdGroup' | 'NameMusicGenre' | 'TotalRecords'>): Promise<Group> {
  const { NameGroup, ImageGroup, MusicGenreId } = groupData;
  
  const [results] = await sequelize.query(
    'INSERT INTO "Groups" ("NameGroup", "ImageGroup", "MusicGenreId") VALUES (:name, :image, :musicGenreId) RETURNING "IdGroup"',
    {
      replacements: {
        name: NameGroup,
        image: ImageGroup,
        musicGenreId: MusicGenreId
      },
      type: 'INSERT' as const
    }
  );
  
  const insertedId = (results as any)[0].IdGroup;
  return { IdGroup: insertedId, ...groupData };
}

export async function update(id: number, groupData: Partial<Omit<Group, 'IdGroup' | 'NameMusicGenre' | 'TotalRecords'>>): Promise<boolean> {
  const fields = [];
  const replacements: { [key: string]: any } = { id };
  
  if (groupData.NameGroup !== undefined) {
    fields.push('"NameGroup" = :name');
    replacements.name = groupData.NameGroup;
  }
  if (groupData.ImageGroup !== undefined) {
    fields.push('"ImageGroup" = :image');
    replacements.image = groupData.ImageGroup;
  }
  if (groupData.MusicGenreId !== undefined) {
    fields.push('"MusicGenreId" = :musicGenreId');
    replacements.musicGenreId = groupData.MusicGenreId;
  }
  
  if (fields.length === 0) return false;
  
  const query = `
    UPDATE "Groups" 
    SET ${fields.join(', ')}
    WHERE "IdGroup" = :id
  `;
  
  const [_, rowCount] = await sequelize.query(query, {
    replacements,
    type: 'UPDATE' as const
  });
  
  return (rowCount as number) > 0;
}

export async function remove(id: number): Promise<boolean> {
  const [_, rowCount] = await sequelize.query(
    'DELETE FROM "Groups" WHERE "IdGroup" = :id',
    {
      replacements: { id },
      type: 'DELETE' as const
    }
  );
  return (rowCount as number) > 0;
}

export async function hasRecords(id: number): Promise<boolean> {
  const [results] = await sequelize.query(
    'SELECT COUNT(*) as count FROM "Records" WHERE "GroupId" = :id',
    {
      replacements: { id },
      type: 'SELECT' as const
    }
  );
  return (results as any).count > 0;
}

export async function musicGenreExists(id: number): Promise<boolean> {
  const { MusicGenre } = require('../models');
  const count = await MusicGenre.count({
    where: { IdMusicGenre: id }
  });
  return count > 0;
}

export default {
  getAll,
  getById,
  getRecordsByGroupId,
  create,
  update,
  remove,
  hasRecords,
  musicGenreExists,
};
