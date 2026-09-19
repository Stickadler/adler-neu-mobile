export type EntryKind='todo'|'pinboard';
export type VoiceDraft={kind:EntryKind|null;title:string;description?:string;dueDate?:string;assigneeName?:string;needsDestinationChoice:boolean};
export type Employee={id:string;displayName:string;active:boolean};
