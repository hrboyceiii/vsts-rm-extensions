import * as assert from 'assert';
import * as path from 'path'
import * as fs from 'fs'

import * as models from "../Models"
import * as engine from "../Engine"
import * as providers from "../Providers"

import { BasicCredentialHandler } from "../Providers/typed-rest-client/handlers/basiccreds";
import { PersonalAccessTokenCredentialHandler } from "../Providers/typed-rest-client/handlers/personalaccesstoken";
import { ArtifactItemStore } from '../Store/artifactItemStore';
import { TicketState } from '../Models/ticketState';
import { ItemType } from '../Models/itemType';
import { ArtifactDownloadTicket } from '../Models/artifactDownloadTicket';

var config = require("../test.config.json")

describe('perf tests', () => {
    //Artifact details => Files: 301, Total Size: 1.7GB
    it('should be able to download large build artifact from vsts drop', function (done) {
        this.timeout(300000);
        let processor = new engine.ArtifactEngine();

        let processorOptions = new engine.ArtifactEngineOptions();
        processorOptions.itemPattern = "**";
        processorOptions.parallelProcessingLimit = 8;
        processorOptions.retryIntervalInSeconds = 2;
        processorOptions.retryLimit = 4;
        processorOptions.verbose = true;

        var itemsUrl = "https://testking123.visualstudio.com/_apis/resources/Containers/1902716?itemPath=largedrop&isShallow=false";
        var variables = {};

        var handler = new PersonalAccessTokenCredentialHandler(config.vsts.pat);
        var webProvider = new providers.WebProvider(itemsUrl, "vsts.handlebars", variables, handler, { ignoreSslError: false });
        var dropLocation = path.join(config.dropLocation, "vstsDropWithLargeFiles");
        var filesystemProvider = new providers.FilesystemProvider(dropLocation);

        processor.processItems(webProvider, filesystemProvider, processorOptions)
            .then((tickets) => {
                let fileTickets = tickets.filter(x => x.artifactItem.itemType == ItemType.File && x.state === TicketState.Processed);
                assert.equal(fileTickets.length, 301);
                assert(getDownloadSizeInMB(fileTickets) > 300);
                done();
            }, (error) => {
                throw error;
            });
    });

    //Artifact details => Files: 301, Total Size: 1.7GB
    it('should be able to download large build artifact from fileshare', function (done) {
        this.timeout(900000);
        let processor = new engine.ArtifactEngine();

        let processorOptions = new engine.ArtifactEngineOptions();
        processorOptions.itemPattern = "**";
        processorOptions.parallelProcessingLimit = 8;
        processorOptions.retryIntervalInSeconds = 2;
        processorOptions.retryLimit = 4;
        processorOptions.verbose = true;

        var itemsUrl = "//vscsstor/Users/gykuma/ArtifactEngineTestData/bp/";

        var sourceProvider = new providers.FilesystemProvider(itemsUrl);
        var dropLocation = path.join(config.dropLocation, "fileshareWithLargeFiles");
        var filesystemProvider = new providers.FilesystemProvider(dropLocation);

        processor.processItems(sourceProvider, filesystemProvider, processorOptions)
            .then((tickets) => {
                let fileTickets = tickets.filter(x => x.artifactItem.itemType == ItemType.File && x.state === TicketState.Processed);
                assert.equal(fileTickets.length, 301);
                assert(getDownloadSizeInMB(fileTickets) > 300);
                done();
            }, (error) => {
                throw error;
            });
    });
});

function getDownloadSizeInMB(fileTickets: ArtifactDownloadTicket[]): number {
    let totalDownloadSizeInBytes = 0;
    for (var ticket of fileTickets) {
        totalDownloadSizeInBytes += ticket.downloadSizeInBytes;
    }
    return totalDownloadSizeInBytes / (1024 *1024);
}