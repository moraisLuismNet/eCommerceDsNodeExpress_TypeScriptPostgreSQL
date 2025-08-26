import express from "express";
const router = express.Router();
import recordsController from "../controllers/recordsController";
import authMiddleware from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware"; 

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Disk management
 */

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: Gets all records
 *     tags: [Records]
 *     responses:
 *       200:
 *         description: List of records
 */
router.get('/', recordsController.getRecords); 

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     summary: Gets a record by ID
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record details
 */
router.get('/:id', recordsController.getRecordById); 

/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     summary: Deletes a record by ID
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Record deleted successfully
 */
router.delete('/:id', authMiddleware('Admin'), recordsController.deleteRecord); 

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Creates a new record
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               TitleRecord:
 *                 type: string
 *               YearOfPublication:
 *                 type: integer
 *               Price:
 *                 type: number
 *               Stock:
 *                 type: integer
 *               Discontinued:
 *                 type: boolean
 *               GroupId:
 *                 type: integer
 *               Photo:
 *                 type: string
 *                 format: binary
 *                 description: The image of the record (optional)
 *     responses:
 *       201:
 *         description: Record created successfully
 */
router.post('/', authMiddleware('Admin'), upload.single('Photo'), recordsController.createRecord);

/**
 * @swagger
 * /api/records/{id}:
 *   put:
 *     summary: Updates an existing record
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               TitleRecord:
 *                 type: string
 *               YearOfPublication:
 *                 type: integer
 *               Price:
 *                 type: number
 *               Stock:
 *                 type: integer
 *               Discontinued:
 *                 type: boolean
 *               GroupId:
 *                 type: integer
 *               Photo:
 *                 type: string
 *                 format: binary
 *                 description: The image of the record (optional)
 *     responses:
 *       200:
 *         description: Record updated successfully
 */
router.put('/:id', authMiddleware('Admin'), upload.single('Photo'), recordsController.updateRecord);

/**
 * @swagger
 * /api/records/{id}/updateStock/{amount}:
 *   put:
 *     summary: Updates the stock of a record
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: amount
 *         required: true
 *         description: Amount to add or subtract from the stock
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Invalid amount
 */
router.put('/:id/updateStock/:amount', recordsController.updateStock);

export default router ;