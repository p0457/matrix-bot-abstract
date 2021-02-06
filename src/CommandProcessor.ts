import { MatrixClient, RichReply } from "matrix-bot-sdk";
import { LogService } from "matrix-js-snippets";
import striptags = require("striptags");
import config from "./config";
const axios = require("axios");

export class CommandProcessor {
    constructor(private client: MatrixClient) {
    }

    public tryCommand(roomId: string, event: any): Promise<any> {
        const message = event['content']['body'].trim().toLowerCase();
        const query = message.substring("!abstract ".length);

        let url = "http://api.duckduckgo.com/?format=json&q=";

        try {
            if (query === "help") {
                let helpText = "<h4>Abstract Bot Help</h4><pre><code>";
                helpText += "!abstract help    - Shows this help menu\n";
                helpText += "!abstract [QUERY] - Get an Abstract for a query\n";
                helpText += "</code></pre>";
                return this.sendHtmlReply(roomId, event, helpText);
            }
            return new Promise((resolve, reject) => {
                axios(
                {
                    method: 'get',
                    headers: {
                        "Accept": "application/json"
                    }, 
                    url
                })
                .then((response) => {
                    if (!response.data) return this.sendHtmlReply(roomId, event, `Error processing data`);
                    else {
                        const abstractBody = response.data;
                        let topic;
                        let content;
                        if (abstractBody.RelatedTopics && abstractBody.RelatedTopics.length) {
                            topic = abstractBody.RelatedTopics[0];
                        }
                        if (abstractBody.AbstractText) {
                            content = abstractBody.AbstractText as string;
                            if (abstractBody.AbstractURL) {
                                url = abstractBody.AbstractURL as string;
                                content = `${url}\n${content}`;
                            } 
                        } else if (topic && !/\/c\//.test(topic.FirstURL)) {
                            content = topic.Text as string;
                            url = topic.FirstURL as string;
                            content = `${url}\n${content}`;
                        } else if (abstractBody.Definition) {
                            content = abstractBody.Definition as string;
                            if (abstractBody.DefinitionURL) {
                                url = abstractBody.DefinitionURL as string;
                                content = `${url}\n${content}`;
                            }
                        } else {
                            content = `Nothing found for the abstract <code>${query}</code>`
                        }
                        if (topic && !content) content = topic;
                        return this.sendHtmlReply(roomId, event, content);
                    }
                }, (error) => {
                    LogService.error("CommandProcessor", error);
                    this.sendHtmlReply(roomId, event, "There was an error processing your command");
                    reject(error);
                });
                resolve();
            });
        } catch (err) {
            LogService.error("CommandProcessor", err);
            return this.sendHtmlReply(roomId, event, "There was an error processing your command");
        }
    }

    private sendHtmlReply(roomId: string, event: any, message: string): Promise<any> {
        const reply = RichReply.createFor(roomId, event, striptags(message), message);
        reply["msgtype"] = "m.notice";
        return this.client.sendMessage(roomId, reply);
    }
}
