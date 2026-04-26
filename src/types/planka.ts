export interface PlankaAuthToken {
  token: string;
}

export interface PlankaAuthResponse {
  item: PlankaAuthToken;
  included?: {
    user?: User;
  };
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  language?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  position?: number;
  isClosed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  projectId?: string;
  background?: {
    name?: string;
    type?: string;
    color?: string;
  };
}

export interface Card {
  id: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  position: number;
  listId: string;
  boardId?: string;
  creatorUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface List {
  id: string;
  name: string;
  isArchived?: boolean;
  position?: number;
  boardId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  position?: number;
  boardId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardLabel {
  id: string;
  cardId: string;
  labelId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardPayload {
  lists: List[];
  cards: Card[];
  labels: Label[];
  cardLabels: CardLabel[];
}

export interface PlankaCollectionResponse {
  items: unknown[];
}

export interface PlankaItemResponse {
  item: unknown;
}
