// server/controllers/spaceTypesController.js
import { Request, Response, NextFunction } from 'express';
import { spaceTypeModel } from '../models/spaceType.model.js';

export const spaceTypesController = {
    async getSpaceTypes(req: Request, res: Response) {
        try {
            const types = await spaceTypeModel.findAll();
            res.json(types);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch space types.' });
        }
    },
    async createSpaceType(req: Request, res: Response) {
        try {
            const newType = await spaceTypeModel.create(req.body);
            res.status(201).json(newType);
        } catch (error: unknown) {
            res.status(500).json({ message: `Failed to create space type: ${(error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) : String(error))}` });
        }
    },
    async updateSpaceType(req: Request, res: Response) {
        try {
            // @ts-ignore
            const updatedType = await spaceTypeModel.update(req.params.id, req.body);
            res.json(updatedType);
        } catch (error: unknown) {
            res.status(500).json({ message: `Failed to update space type: ${(error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) : String(error))}` });
        }
    },
    async deleteSpaceType(req: Request, res: Response) {
        try {
            // @ts-ignore
            await spaceTypeModel.delete(req.params.id);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(400).json({ message: `Failed to delete space type: ${(error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) : String(error))}` });
        }
    }
};
