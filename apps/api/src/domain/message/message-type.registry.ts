import { Injectable, BadRequestException } from '@nestjs/common';
import { MessageType, VOTABLE_TYPES, COMMENTABLE_TYPES } from '@placement/shared';

@Injectable()
export class MessageTypeRegistry {
  assertVotable(type: MessageType): void {
    if (!VOTABLE_TYPES.has(type)) {
      throw new BadRequestException({ error: { code: 'MESSAGE_NOT_VOTABLE', message: `${type} cannot be voted`, details: {} } });
    }
  }

  assertCommentable(type: MessageType): void {
    if (!COMMENTABLE_TYPES.has(type)) {
      throw new BadRequestException({ error: { code: 'MESSAGE_NOT_COMMENTABLE', message: `${type} cannot be commented`, details: {} } });
    }
  }
}
