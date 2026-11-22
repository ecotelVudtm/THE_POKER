import { Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';

export class InMemoryRoomRepository implements IRoomRepository {
  private readonly rooms = new Map<string, Room>();

  public async findById(roomId: string): Promise<Room | null> {
    return this.rooms.get(roomId) ?? null;
  }

  public async findAll(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  public async save(room: Room): Promise<void> {
    this.rooms.set(room.id, room);
  }

  public async delete(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
  }

  public async findBySocketId(socketId: string): Promise<Room | null> {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.socketId === socketId)) {
        return room;
      }
    }
    return null;
  }

  public async findByAccountId(accountId: string): Promise<Room | null> {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.accountId === accountId)) {
        return room;
      }
    }
    return null;
  }
}
