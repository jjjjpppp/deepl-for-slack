import { Logger } from "@slack/logger";

export interface TranslatorInterface {
    authKey:string
    authSecret:string
    logger:Logger
    translate(test:string, targetLanguage: string): Promise<string | null> 
}