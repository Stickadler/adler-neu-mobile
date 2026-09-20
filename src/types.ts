export type EntryKind='todo'|'pinboard';
export type VoiceDraft={kind:EntryKind|null;title:string;description?:string;dueDate?:string;dueTime?:string;assigneeName?:string;assignToSelf?:boolean;needsDestinationChoice:boolean};
export type Employee={id:string;displayName:string;active:boolean};
export type EntryPayload={title:string;description?:string;due_at?:string;assigned_user_ids:string[];attachment_ids:string[]};
