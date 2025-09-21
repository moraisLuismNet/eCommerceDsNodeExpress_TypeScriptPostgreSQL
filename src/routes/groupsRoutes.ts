import express from "express";
const router = express.Router();
import groupsController from "../controllers/groupsController"; 
import authMiddleware from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Management of musical groups
 */

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Gets all musical groups
 *     tags: [Groups]
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 */
router.get('/', groupsController.getGroups);

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     summary: Gets a group by ID with its records
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Group with records
 */
router.get('/:id', groupsController.getGroupWithRecords);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Creates a new group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               NameGroup:
 *                 type: string
 *                 description: Group name
 *               MusicGenreId:
 *                 type: integer
 *                 description: ID of the musical genre to which it belongs
 *               Photo:
 *                 type: string
 *                 format: binary
 *                 description: Image file for the group
 *     responses:
 *       201:
 *         description: Group created successfully
 */
// Configure the file upload middleware to handle multipart/form-data
const uploadIfExists = (req: any, res: any, next: any) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        return upload.single('Photo')(req, res, next);
    }
    next();
};

router.post('/', authMiddleware('Admin'), uploadIfExists, groupsController.createGroup);

/**
 * @swagger
 * /api/groups/{id}:
 *   put:
 *     summary: Updates an existing group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               NameGroup:
 *                 type: string
 *               MusicGenreId:
 *                 type: integer
 *               Photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Group updated successfully
 */
router.put('/:id', authMiddleware('Admin'), uploadIfExists, groupsController.updateGroup);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Deletes a group
 *     tags: [Groups]
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
 *         description: Group deleted successfully
 */
router.delete('/:id', authMiddleware('Admin'), groupsController.deleteGroup);

export default router;