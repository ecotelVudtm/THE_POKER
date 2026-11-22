import { Room } from '../entities/Room';

export interface IRoomRepository {
  findById(roomId: string): Promise<Room | null>;
  findAll(): Promise<Room[]>;
  save(room: Room): Promise<void>;
  delete(roomId: string): Promise<void>;
  findBySocketId(socketId: string): Promise<Room | null>;
  findByAccountId(accountId: string): Promise<Room | null>;
}
