import { Request, Response } from 'express';
import recordService from "../services/recordService";
import groupService from "../services/groupService";

interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

interface RecordRequest extends Request {
    file?: Express.Multer.File;
    body: {
        TitleRecord?: string;
        YearOfPublication?: string | number;
        Price?: string | number;
        Stock?: string | number;
        Discontinued?: string | boolean;
        GroupId?: string | number;
    };
    params: {
        id?: string;
        amount?: string;
    };
}

async function getRecords(req: Request, res: Response<ApiResponse>) {
    try {
        const records = await recordService.getAll();
        res.json({
            success: true,
            message: 'Records retrieved successfully',
            data: records
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

async function getRecordById(req: Request, res: Response<ApiResponse>) {
    try {
        const record = await recordService.getById(Number(req.params.id));
        if (!record) {
            return res.status(404).json({ 
                success: false,
                message: 'Record not found' 
            });
        }
        const camelCaseRecord = {
            idRecord: record.IdRecord,
            titleRecord: record.TitleRecord,
            yearOfPublication: record.YearOfPublication,
            imageRecord: record.ImageRecord,
            price: record.Price,
            stock: record.Stock,
            discontinued: record.Discontinued,
            groupId: record.GroupId,
            nameGroup: record.NameGroup
        };
        res.json({
            success: true,
            message: 'Record retrieved successfully',
            data: camelCaseRecord
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

async function deleteRecord(req: Request, res: Response<ApiResponse>) {
    try {
        const success = await recordService.remove(Number(req.params.id));
        if (!success) {
            return res.status(404).json({ 
                success: false,
                message: 'Record not found' 
            });
        }
        res.status(204).send(); 
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

async function updateStock(req: Request, res: Response<ApiResponse<{ message: string; newStock: number }>>) {
    const { id, amount } = req.params;
    try {
        const result = await recordService.updateStock(parseInt(id), parseInt(amount));
        res.json({
            success: true,
            message: `The stock of the record with ID ${id} has been updated by ${amount} units`,
            data: {
                message: 'Stock updated successfully',
                newStock: result.newStock
            }
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(400).json({ 
            success: false,
            message: 'Bad request',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

async function createRecord(req: RecordRequest, res: Response<ApiResponse>) {
    try {
        const { TitleRecord, YearOfPublication, Price, Stock, Discontinued, GroupId } = req.body;

        // Validate that the group exists
        const group = await groupService.getById(Number(GroupId));
        if (!group) {
            return res.status(400).json({ 
                success: false,
                message: `The Group with ID ${GroupId} does not exist` 
            });
        }

        if (!TitleRecord || !YearOfPublication || !Price || !Stock || !GroupId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const newRecord = {
            TitleRecord: String(TitleRecord),
            YearOfPublication: Number(YearOfPublication),
            Price: Number(Price),
            Stock: Number(Stock),
            Discontinued: Discontinued === 'true',
            GroupId: Number(GroupId),
            ImageRecord: req.file ? `/img/${req.file.filename}` : '' // Empty string instead of null
        };

        const createdRecord = await recordService.create(newRecord);
        
        // Return a 201 Created response with the location and the created object
        res.status(201)
            .location(`/api/records/${createdRecord.IdRecord}`)
            .json({
                success: true,
                message: 'Record created successfully',
                data: createdRecord
            });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

async function updateRecord(req: RecordRequest, res: Response<ApiResponse>) {
    const { id } = req.params;
    try {
        const recordId = Number(id);
        let record = await recordService.getById(recordId);
        if (!record) {
            return res.status(404).json({ 
                success: false,
                message: `Record with ID ${id} not found` 
            });
        }

        const { TitleRecord, YearOfPublication, Price, Stock, Discontinued, GroupId } = req.body;

        if (GroupId) {
            const group = await groupService.getById(Number(GroupId));
            if (!group) {
                return res.status(400).json({ 
                    success: false,
                    message: `The Group with ID ${GroupId} does not exist` 
                });
            }
        }

        const updatedData = {
            TitleRecord: TitleRecord !== undefined ? String(TitleRecord) : record.TitleRecord,
            YearOfPublication: YearOfPublication !== undefined ? Number(YearOfPublication) : record.YearOfPublication,
            Price: Price !== undefined ? Number(Price) : record.Price,
            Stock: Stock !== undefined ? Number(Stock) : record.Stock,
            Discontinued: Discontinued !== undefined ? (String(Discontinued) === 'true') : record.Discontinued,
            GroupId: GroupId !== undefined ? Number(GroupId) : record.GroupId,
            ImageRecord: req.file ? `/img/${req.file.filename}` : record.ImageRecord
        };

        await recordService.update(recordId, updatedData);
        res.json({
            success: true,
            message: 'Record updated successfully',
            data: { IdRecord: id, ...updatedData }
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

export default { 
    getRecords, 
    getRecordById, 
    createRecord, 
    updateRecord, 
    deleteRecord, 
    updateStock 
};