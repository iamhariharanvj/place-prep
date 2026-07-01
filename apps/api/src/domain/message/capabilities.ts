import { MessageType, MessageCapability, Visibility, VOTABLE_TYPES, COMMENTABLE_TYPES } from '@placement/shared';

export interface MessageRow {
  id: string;
  type: MessageType;
  authorId: string;
  aliasId: string | null;
  visibility: Visibility;
  voteScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorContext {
  viewerId?: string;
  viewerRole?: string;
  aliasDisplayName?: string;
  authorDisplayName?: string;
}

export interface PublicAuthorDto {
  displayName: string;
  isAnonymous: boolean;
}

export function resolveAuthor(row: MessageRow, ctx: AuthorContext): PublicAuthorDto {
  if (row.visibility === Visibility.SEMI_ANONYMOUS) {
    return { displayName: ctx.aliasDisplayName ?? 'Anonymous', isAnonymous: true };
  }
  return { displayName: ctx.authorDisplayName ?? 'User', isAnonymous: false };
}

export { VOTABLE_TYPES, COMMENTABLE_TYPES, MessageCapability };
