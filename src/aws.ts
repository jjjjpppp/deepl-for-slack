import { default as axios, AxiosInstance } from "axios";
import qs from "qs";
import { Logger } from "@slack/logger";
import { TranslatorInterface } from './translator_interface';
import  AWS from "aws-sdk";
import { rejects } from "assert";
const { promisify } = require('util');

export class AwsApi implements TranslatorInterface{
  authKey: string;
  logger: Logger;
  private translationServiceClient: AWS.Translate;
  constructor(authKey: string, logger: Logger) {
    this.authKey = authKey;
    this.logger = logger;
    this.translationServiceClient = new AWS.Translate({region: 'ap-northeast-1'});
  }

  async translate(text: string, targetLanguage: string): Promise<string | null> {
    const params = {
      SourceLanguageCode: 'auto', /* required */
      TargetLanguageCode: targetLanguage, /* required */
      Text: text, /* required */
    };

    return this.translationServiceClient.translateText(params).promise().then(res => {
      return res.TranslatedText
    }).catch(error => {
      this.logger.error(`Failed: ${error}`);
      return `Failed: ${error}`;
    })
  }
}