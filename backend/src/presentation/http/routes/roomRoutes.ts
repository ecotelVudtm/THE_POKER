import { Router } from 'express';
import { RoomController } from '../controllers/RoomController';

export function createRoomRoutes(controller: RoomController): Router {
  const router = Router();
  router.get('/', controller.listRooms);
  router.get('/:id', controller.getRoom);
  return router;
}
