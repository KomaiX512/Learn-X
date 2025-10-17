interface KeyNote {
    category: string;
    items: Array<{
        title: string;
        formula?: string;
        description?: string;
        useCase?: string;
        edgeCase?: string;
    }>;
}
interface NotesResponse {
    notes: KeyNote[];
}
interface StepContent {
    stepId: number;
    title: string;
    transcript: string;
    actions: any[];
    complexity: number;
    isAvailable?: boolean;
}
export declare function generateKeyNotes(topic: string, lectureSummary?: string, steps?: Array<{
    title: string;
    desc?: string;
}>, stepContents?: StepContent[], isPartial?: boolean): Promise<NotesResponse>;
export {};
//# sourceMappingURL=notesGenerator.d.ts.map