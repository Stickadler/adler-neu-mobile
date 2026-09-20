export type EntryKind='todo'|'pinboard';
export type VoiceDraft={kind:EntryKind|null;title:string;description?:string;dueDate?:string;dueTime?:string;assigneeName?:string;assignToSelf?:boolean;needsDestinationChoice:boolean};
export type Employee={id:string;name:string;active:boolean;userId?:string};
export type EntryPayload={title:string;description?:string;dueDate?:string;assignedEmployeeId?:string};
