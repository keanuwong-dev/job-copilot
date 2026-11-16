/**
 * Gmail scanner for the job tracker.
 * Paste this file into script.google.com, set INGEST_URL and API_KEY, then run install().
 */
var SEARCH_QUERY =
  'newer_than:2d -label:jobtracker-processed (from:greenhouse.io OR from:greenhouse-mail.io OR from:lever.co OR from:hire.lever.co OR from:ashbyhq.com OR from:myworkday.com OR from:icims.com OR from:smartrecruiters.com OR subject:(application OR applying OR interview OR assessment OR "next steps"))';
var PROCESSED_LABEL = 'jobtracker-processed';
var BATCH_SIZE = 25;
var BODY_LIMIT = 4000;

function install() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var index = 0; index < triggers.length; index += 1) {
    if (triggers[index].getHandlerFunction() === 'scan') {
      ScriptApp.deleteTrigger(triggers[index]);
    }
  }
  ScriptApp.newTrigger('scan').timeBased().everyMinutes(15).create();
}

function scan() {
  var properties = PropertiesService.getScriptProperties();
  var ingestUrl = properties.getProperty('INGEST_URL');
  var apiKey = properties.getProperty('API_KEY');
  if (!ingestUrl || !apiKey) {
    console.error('Set INGEST_URL and API_KEY in Script properties.');
    return;
  }

  var label =
    GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);
  var threads = GmailApp.search(SEARCH_QUERY, 0, BATCH_SIZE);
  var messages = [];
  var originals = [];

  for (var threadIndex = 0; threadIndex < threads.length; threadIndex += 1) {
    var threadMessages = threads[threadIndex].getMessages();
    for (var messageIndex = 0; messageIndex < threadMessages.length; messageIndex += 1) {
      if (messages.length >= BATCH_SIZE) break;
      var message = threadMessages[messageIndex];
      var body = message.getPlainBody() || '';
      messages.push({
        gmail_message_id: message.getId(),
        from: message.getFrom() || '',
        subject: message.getSubject() || '',
        snippet: body.slice(0, 180),
        body: body.slice(0, BODY_LIMIT),
        received_at: message.getDate().toISOString(),
      });
      originals.push(message);
    }
  }

  if (messages.length === 0) return;

  var response = UrlFetchApp.fetch(ingestUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify({ messages: messages }),
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    console.error('Ingest failed', code, response.getContentText());
    return;
  }

  for (var labelIndex = 0; labelIndex < originals.length; labelIndex += 1) {
    originals[labelIndex].getThread().addLabel(label);
  }
}
