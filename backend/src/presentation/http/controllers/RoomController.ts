import { Request, Response } from 'express';
import { IRoomRepository } from '../../../domain/repositories/IRoomRepository';
import { filterRoomStateForViewer } from '../../../domain/rules/StateFilter';

export class RoomController {
  constructor(private readonly roomRepo: IRoomRepository) {}

  public listRooms = async (_req: Request, res: Response): Promise<void> => {
    try {
      const rooms = await this.roomRepo.findAll();
      const summaries = rooms.map((room) => ({
        id: room.id,
        name: room.name,
        status: room.status,
        phase: room.phase,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        smallBlind: room.smallBlind,
        bigBlind: room.bigBlind,
        handNumber: room.handNumber,
      }));
      res.status(200).json({ rooms: summaries });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public getRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const room = await this.roomRepo.findById(req.params.id.toUpperCase());
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      // REST inspection never reveals private hole cards
      res.status(200).json({ room: filterRoomStateForViewer(room, null) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
