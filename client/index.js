import './style.css';
import {
    addRxPlugin,
    createRxDatabase
} from 'rxdb';

import {
    getRxStorageDexie
} from 'rxdb/plugins/storage-dexie';

import {
    getRxStorageLoki
} from 'rxdb/plugins/storage-lokijs';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';

import {
    filter
} from 'rxjs/operators';

import {
    pullQueryBuilderFromRxSchema,
    pushQueryBuilderFromRxSchema,
    pullStreamBuilderFromRxSchema,
    replicateGraphQL
} from 'rxdb/plugins/replication-graphql';



//import * as firebase from 'firebase/app';
import firebase from 'firebase/compat/app'
import {
    getFirestore,
    collection
} from 'firebase/firestore';

import { doc, setDoc } from "firebase/firestore"; 
import { initializeApp } from 'firebase/app';
import { serverTimestamp } from '@firebase/firestore'

const projectId = 'amiti-psvarun';


// TODO import these only in non-production build

import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBUpdatePlugin);

import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);


import {
    GRAPHQL_PORT,
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PORT,
    GRAPHQL_SUBSCRIPTION_PATH,
    heroSchema,
    graphQLGenerationInput,
    JWT_BEARER_TOKEN
} from '../shared';


/* import {
    replicateP2P,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-p2p'; */

import {
      replicateFirestore
} from 'rxdb/plugins/replication-firestore';


const insertButton = document.querySelector('#insert-button');
const updateButton= document.querySelector('.update-now');
const heroesList = document.querySelector('#heroes-list');
const leaderIcon = document.querySelector('#leader-icon');
const storageField = document.querySelector('#storage-key');
const databaseNameField = document.querySelector('#database-name');

console.log('hostname: ' + window.location.hostname);


/* const syncUrls = {
    http: 'http://' + '117.192.46.245' + ':' + GRAPHQL_PORT + GRAPHQL_PATH,
    ws: 'ws://117.192.46.245:' + GRAPHQL_SUBSCRIPTION_PORT + GRAPHQL_SUBSCRIPTION_PATH
}; */


const batchSize = 50;

const pullQueryBuilder = pullQueryBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero,
    batchSize
);
const pushQueryBuilder = pushQueryBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero
);

const pullStreamBuilder = pullStreamBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero
);

/**
 * In the e2e-test we get the database-name from the get-parameter
 * In normal mode, the database name is 'heroesdb'
 */
function getDatabaseName() {
    const url_string = window.location.href;
    const url = new URL(url_string);
    const dbNameFromUrl = url.searchParams.get('database');

    let ret = 'heroesdb';
    if (dbNameFromUrl) {
        console.log('databaseName from url: ' + dbNameFromUrl);
        ret += dbNameFromUrl;
    }
    return ret;
}

function doSync() {
    //const url_string = window.location.href;
    //const url = new URL(url_string);
    //const shouldSync = url.searchParams.get('sync');
    //if (shouldSync && shouldSync.toLowerCase() === 'false') {
     //   return false;
    //} else {
    //    return true;
    //}
    return true;
}


function getStorageKey() {
    //const url_string = window.location.href;
    //const url = new URL(url_string);
    //let storageKey = url.searchParams.get('storage');
    //if (!storageKey) {
    //    storageKey = 'dexie';
    //}
    return 'dexie';
}

/**
 * Easy toggle of the storage engine via query parameter.
 */
function getStorage() {
    const storageKey = getStorageKey();
    if (storageKey === 'lokijs') {
        return getRxStorageLoki({
            adapter: new LokiIncrementalIndexedDBAdapter(),
            autosaveInterval: 999999999,
            autoload: false,
            autocallback() {
                console.log('autoload done');
            },
            autosaveCallback() {
                console.log('Autosave done!');
            }
        });
    } else if (storageKey === 'dexie') {
        return getRxStorageDexie();
    } else if (storageKey === 'memory') {
        return getRxStorageMemory();
    } else {
        throw new Error('storage key not defined ' + storageKey);
    }
}


async function run() {
    storageField.innerHTML = getStorageKey();
    databaseNameField.innerHTML = getDatabaseName();
    heroesList.innerHTML = 'Create database..';
    const db = await createRxDatabase({
        name: getDatabaseName(),
        storage: wrappedValidateAjvStorage({
            storage: getStorage()
        }),
        multiInstance: getStorageKey() !== 'memory'
    });
    window.db = db;

    // display crown when tab is leader
    db.waitForLeadership().then(function () {
        document.title = '♛ ' + document.title;
        leaderIcon.style.display = 'block';
    });

    heroesList.innerHTML = 'Create collection..';
    await db.addCollections({
        hero: {
            schema: heroSchema
        }
    });

    db.hero.preSave(function (docData) {
        docData.updatedAt = new Date().getTime();
    });

    // set up replication
  /*  if (doSync()) {
        heroesList.innerHTML = 'Start replication..';
        const replicationState = replicateGraphQL({
            collection: db.hero,
            url: syncUrls,
            headers: {
                
                Authorization: 'Bearer ' + JWT_BEARER_TOKEN
            },
            push: {
                batchSize,
                queryBuilder: pushQueryBuilder
            },
            pull: {
                batchSize,
                queryBuilder: pullQueryBuilder,
                streamQueryBuilder: pullStreamBuilder
            },
            live: true,
            deletedField: 'deleted'
        });


        // show replication-errors in logs
        heroesList.innerHTML = 'Subscribe to errors..';
        replicationState.error$.subscribe(err => {
            console.error('replication error:');
            console.dir(err);
        });
    }  */
    
  /*  const replicationPool = await replicateP2P(
    {
        collection: db.hero,
        
        topic: 'my-users-pool',
        
        connectionHandlerCreator: getConnectionHandlerSimplePeer(
            'ws://117.192.46.245:10103',
            require('wrtc')
            ),
        pull: {},
        push: {}
    } 
); */

// firebase start

    var app = firebase.initializeApp({
    databaseURL: 'https://amiti-psvarun-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId
    
    });

    var  firestoreDatabase = getFirestore(app);
    var firestoreCollection = collection(firestoreDatabase, 'varundb2');
    
    var replicationState = replicateFirestore(
    {
        collection: db.hero,
        firestore: {
            projectId,
            database: firestoreDatabase,
            collection: firestoreCollection
        },
        pull: {},
        push: {},
       
        live: false,
        
        serverTimestampField: 'serverTimestamp'
    }
);   
 
    await replicationState.awaitInitialReplication();
    await replicationState.cancel();
    await app.delete();

    setInterval(async function() {
         var a = document.querySelector('input[name="name"]').value;
         var b = document.querySelector('input[name="color"]').value;
         var modal1 = document.getElementById("update-modal");
         var c = window.getComputedStyle(modal1).display;
         if(a=='' && b=='' && c=='none')
         {
        await db.hero.remove();
        re_sync1();
         }
        }, 25000);
  
// firebase end
    
    
    


    // log all collection events for debugging
    db.hero.$.pipe(filter(ev => !ev.isLocal)).subscribe(ev => {
        console.log('collection.$ emitted:');
        console.dir(ev);
    });


    /**
     * We await the initial replication
     * so that the client never shows outdated data.
     * You should not do this if you want to have an
     * offline-first client, because the initial sync
     * will not run through without a connection to the
     * server.
     */
    heroesList.innerHTML = 'Await initial replication..';
    // TODO this did full block the loading because awaitInitialReplication() never resolves if other tab is leader
    // await replicationState.awaitInitialReplication();

    // subscribe to heroes list and render the list on change
    heroesList.innerHTML = 'Subscribe to query..';
    db.hero.find()
        .sort({
            name: 'asc'
        })
        .$.subscribe(function (heroes) {
            console.log('emitted heroes:');
            console.dir(heroes.map(d => d.toJSON()));
            let html = '';
            heroes.forEach(function (hero) {
                html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name} (updatedAt: ${hero.updatedAt})</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">&nbsp;|&nbsp;DELETE</div>
                        <div class="delete-icon" onclick="window.show_update_modal('${hero.primary}')">UPDATE</div>
                        
                        
                    </li>
                `;
            });
            heroesList.innerHTML = html;
        });

                        // firebase constants...
                        var config2 = {
                                            databaseURL: 'https://amiti-psvarun-default-rtdb.asia-southeast1.firebasedatabase.app',
                                            projectId:'amiti-psvarun'
                                        };
                            var app2 = initializeApp(config2);
                            var db2 = getFirestore(app2);
                        //

    // set up click handlers
    window.deleteHero = async (id) => {
        console.log('delete doc ' + id);
        const doc2 = await db.hero.findOne(id).exec();
        if (doc) {
            console.log('got doc, remove it');
            try {
              await doc2.remove();
               } catch (err) {
                console.error('could not remove doc');
                console.dir(err);
            }
           }
            //fb start---------------------------------------------------------------------------------
                  await setDoc(doc(db2, "varundb2", id), {
                    name: "",
                    color: "",
                    updatedAt: 12,
                    _deleted: true,
                    serverTimestamp: serverTimestamp()
                    }); 
                        
            //fb end------------------------------------------------------------------------------------

    };
    insertButton.onclick = async function () {
        const name = document.querySelector('input[name="name"]').value.replaceAll(' ','');
        const color = document.querySelector('input[name="color"]').value.replaceAll(' ','');
        const obj = {
            id: name,
            name: name,
            color: color,
            updatedAt: new Date().getTime()
        };
        console.log('inserting hero:');
        console.dir(obj);

        await db.hero.insert(obj);
        //fb start--------------------------------------------------------------------------------------------
            await setDoc(doc(db2, "varundb2", obj.id), {
            name:obj.name,
            color: obj.color,
            updatedAt: obj.updatedAt,
            _deleted: false,
            serverTimestamp: serverTimestamp()
             });
        //fb end-----------------------------------------------------------------------------------------------
        
        document.querySelector('input[name="name"]').value = '';
        document.querySelector('input[name="color"]').value = '';
    };

// function to show update modal starts
 window.show_update_modal = async (id) => {
 var modal = document.getElementById("update-modal");
 
const rec = await db.hero.findOne(id).exec();
console.log(rec._data);
document.getElementById('old-key').value=rec._data.id;
document.getElementById('name-update').value=rec._data.name;
document.getElementById('color-update').value=rec._data.color;
modal.style.display = "block";
}
// function to show update modal ends

// function to update start
updateButton.onclick= async function (){
var modal = document.getElementById("update-modal");

var old_key = document.getElementById('old-key').value.replaceAll(' ','');
var new_name=document.getElementById('name-update').value.replaceAll(' ','');
var new_color=document.getElementById('color-update').value.replaceAll(' ','');
//alert(old_key+new_name+new_color);

const qrysel = await db.hero.findOne(old_key).exec();

//console.log(qrysel);
//alert("wait");
const update_obj = {$set:{
            name: new_name,
            color: new_color,
            updatedAt: new Date().getTime()
        }};
await qrysel.update(update_obj);
// fb start--------------------------------------------------------
        await setDoc(doc(db2, "varundb2", old_key), {
        name: new_name,
        color: new_color,
        updatedAt:new Date().getTime(),
        _deleted: false,
        serverTimestamp: serverTimestamp()
        });

// fb end-----------------------------------------------------------
document.getElementById('old-key').value='';
document.getElementById('name-update').value='';
document.getElementById('color-update').value='';
modal.style.display = "none";



}
//function to update end
}


run().catch(err => {
    console.log('run() threw an error:');
    console.error(err);
});

async function re_sync1()
{
    var config = {
                    databaseURL: 'https://amiti-psvarun-default-rtdb.asia-southeast1.firebasedatabase.app',
                    projectId:'amiti-psvarun'
                  };
    var app = initializeApp(config);
    var db = getFirestore(app);

    await setDoc(doc(db, "cities", "LA"), {
        name: "Los Angeles",
        state: "CA",
        country: "USA"
        });
  location.reload();
}

