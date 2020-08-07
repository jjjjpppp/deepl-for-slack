import { default as axios, AxiosInstance } from "axios";
import qs from "qs";
import { Logger } from "@slack/logger";
import { TranslatorInterface } from './translator_interface';
import { TranslationServiceClient } from "@google-cloud/translate/build/src/v3beta1";

export class GoogleApi implements TranslatorInterface{
  authKey: string;
  logger: Logger;
  private translationServiceClient: TranslationServiceClient;
  constructor(authKey: string, logger: Logger) {
    this.authKey = authKey;
    this.logger = logger;
    this.translationServiceClient = new TranslationServiceClient();
  }

  async translate(text: string, targetLanguage: string): Promise<string | null> {
    const request = {
      parent: this.translationServiceClient.locationPath("translation-281803", "global"),
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: targetLanguage == "en" ? "ja" : "en",
      targetLanguageCode: targetLanguage,
    }
    return this.translationServiceClient.translateText(
      request
    ).then( res => {
      if (
        res != null &&
        res[0].translations != null &&
        res[0].translations[0].translatedText != null
      ) {
        const text = res[0].translations[0].translatedText
        this.logger.debug(text);
        return text;
      } else {
        return `Unexpected Response: ${text}`;
      }
    }).catch(error => {
      this.logger.error(`Failed: ${error}`);
      return `Failed: ${error}`;
    });
  }
}