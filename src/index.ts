import { loadEnv } from './dotenv';
loadEnv();

import { App } from '@slack/bolt';
import { ConsoleLogger, LogLevel } from '@slack/logger';
import * as middleware from './custom-middleware';

import { DeepLApi } from './deepl';
import { GoogleApi } from './google';
import { AwsApi } from './aws';
import * as runner from './runnner';
import * as reacjilator from './reacjilator';
import { TranslatorInterface } from './translator_interface';


let translator: TranslatorInterface;
const logLevel = process.env.SLACK_LOG_LEVEL as LogLevel || LogLevel.INFO;
const logger = new ConsoleLogger();
logger.setLevel(logLevel);

const app = new App({
  logger,
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
middleware.enableAll(app);

// -----------------------------
// generate translation service
// -----------------------------
const generateTranslationService = (service_name: string) => {
  if ('google' === service_name) {
    const googleClientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    if (!googleClientEmail) {
     throw "GOOGLE_CLIENT_EMAIL is missing!";
    }
    const googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!googlePrivateKey) {
     throw "GOOGLE_PRIVATE_KEY is missing!";
    }
    const key = googlePrivateKey.replace(/\\n/g,"\n")

    return new GoogleApi(googleClientEmail, key, logger)

  } else if ('aws' === service_name) {
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    if (!awsAccessKeyId) {
     throw "AWS_ACCESS_KEY_ID is missing!";
    }
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!awsSecretAccessKey) {
     throw "AWS_SECRET_ACCESS_KEY is missing!";
    }
    return new AwsApi(awsAccessKeyId, awsSecretAccessKey, logger)
  }

  const deepLAuthKey = process.env.DEEPL_AUTH_KEY;
  if (!deepLAuthKey) {
     throw "DEEPL_AUTH_KEY is missing!";
  }
  return new DeepLApi(deepLAuthKey, "", logger);
}
translator = generateTranslationService("deepl");

// -----------------------------
// shortcut
// -----------------------------

app.shortcut("deepl-translation", async ({ ack, body, client }) => {
  await ack();
  await runner.openModal(client, body.trigger_id);
});

app.view("run-translation", async ({ ack, client, body }) => {
  const text = body.view.state.values.text.a.value;
  const lang = body.view.state.values.lang.a.selected_option.value;

  await ack({
    response_action: "update",
    view: runner.buildLoadingView(lang, text)
  });

  const translatedText: string | null = await translator.translate(text, lang);

  await client.views.update({
    view_id: body.view.id,
    view: runner.buildResultView(lang, text, translatedText || ":x: Failed to translate it for some reason")
  });
});

app.view("new-runner", async ({ body, ack }) => {
  await ack({
    response_action: "update",
    view: runner.buildNewModal(body.view.private_metadata)
  })
})

// -----------------------------
// reacjilator
// -----------------------------

import { ReactionAddedEvent } from './types/reaction-added';

app.event("reaction_added", async ({ body, client }) => {
  const event = body.event as ReactionAddedEvent;
  if (event.item['type'] !== 'message') {
    return;
  }
  const channelId = event.item['channel'];
  const messageTs = event.item['ts'];
  if (!channelId || !messageTs) {
    return;
  }
  const lang = reacjilator.lang(event);
  if (!lang) {
    return;
  }

  const replies = await reacjilator.repliesInThread(client, channelId, messageTs);
  if (replies.messages && replies.messages.length > 0) {
    const message = replies.messages[0];
    if (message.text) {
      const translatedText = await translator.translate(message.text, lang);
      if (translatedText == null) {
        return;
      }
      if (reacjilator.isAlreadyPosted(replies, translatedText)) {
        return;
      }
      await reacjilator.sayInThread(client, channelId, translatedText, message);
    }
  }
});

// -----------------------------
// change treanslation service
// -----------------------------
app.message('translator aws', async ({message, say}) => {
translator = generateTranslationService("aws");
  await say("Changed, This service is working on AWS translation API.");
});

app.message('translator google', async ({message, say}) => {
translator = generateTranslationService("google");
  await say("Changed, This service is working on Google translation API.");
});

app.message('translator deepl', async ({message, say}) => {
translator = generateTranslationService("deepl");
  await say("Changed, This service is working on DeepL translation API.");
});

app.message('translator help', async ({message, say}) => {
  await say("Change translation back-end command `translator [deepl, aws, google]`");
});


// -----------------------------
// starting the app
// -----------------------------

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();

