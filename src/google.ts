import { default as axios, AxiosInstance } from "axios";
import qs from "qs";
import { Logger } from "@slack/logger";
import { TranslatorInterface } from './translator_interface';
import { TranslationServiceClient } from "@google-cloud/translate/build/src/v3beta1";

export class GoogleApi implements TranslatorInterface{
  authKey: string;
  authSecret: string;
  logger: Logger;
  projectId: string;
  private translationServiceClient: TranslationServiceClient;
  constructor(authKey: string, authSecret: string, logger: Logger) {
    this.authKey = authKey;
    this.authSecret = authSecret;
    this.logger = logger;
    if (!process.env.GCLOUD_PROJECT) {
     throw "GCLOUD_PROJECT is missing!";
    }
    this.projectId = process.env.GCLOUD_PROJECT
    this.translationServiceClient = new TranslationServiceClient(
      {
        projectId: this.projectId,
        credentials: {
          client_email: this.authKey,
          private_key: this.authSecret,
        },
      }
      );
  }

  async translate(text: string, targetLanguage: string): Promise<string | null> {
    const request = {
      parent: this.translationServiceClient.locationPath(this.projectId, "global"),
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: null,
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