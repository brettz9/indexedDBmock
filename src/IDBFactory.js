/**
 * Created by Kristof on 5/11/2015.
 */
define([
    'IDBOpenDBRequest',
    'Database',
    'IDBDatabase',
    'events/IDBVersionChangeEvent',
    'events/IDBVersionChangeEventInit'
], function(IDBOpenDBRequest,
            Database,
            IDBDatabase,
            IDBVersionChangeEvent,
            IDBVersionChangeEventInit){
    var IDBFactory = function(){
        this.dbs = {};
    },
    timeout = 1;

    IDBFactory.prototype = (function(){
        function Open (name, version) {
            var db,
                database,
                openDBRequest = new IDBOpenDBRequest(null, null);

            for(database in this.dbs)
            {
                if(database === name)
                {
                    db = dbs[database];
                }
            }

            if(!db)
            {
                if(!version) {
                    version = 1;
                }
                db = new Database(name);

                dbs[name] = db;
            }

            var connection = new IDBDatabase(db);

            if(version && connection.version > version){
                setTimeout(function(){
                    openDBRequest.__error({
                        name: "VersionError",
                        message: "You are trying to open the database in a lower version (" + version + ") than the current version of the database"
                    }, "VersionError");
                }, timeout);
            }
            else {
                if (version && connection.version < version) {
                    setTimeout(function () {
                        for (var i = 0; i < db.connections.length; i++) {
                            if (db.connections[i]._connectionId !== connection._connectionId) {
                                db.connections[i].__versionchange(version);
                            }
                        }
                        function upgrade(request, connection, db, version) {
                            var currentVersion = connection.version;
                            if(db.connections.length > 0 && db.connections[0]._connectionId !== connection._connectionId){
                                openDBRequest.__blocked(null, connection.version);
                                setTimeout(upgrade, 10, request, connection, db, version);
                            }

                            connection.version = version;
                            db.version = version;

                            openDBRequest.__upgradeneeded(connection
                                , new Transaction(null, TransactionTypes.VERSIONCHANGE, new Snapshot(db, connection))
                                , version
                                , currentVersion);
                        }

                        upgrade(openDBRequest, connection, db, version);

                        setTimeout(function () {
                            if(openDBRequest.transaction._aborted) {
                                openDBRequest.__error({
                                    name: "AbortError",
                                    message: "The transaction was aborted."
                                }, 8);
                            }
                            else {
                                db.connections.push(connection);
                                openDBRequest.__success(connection);
                            }
                        }, timeout);
                    }, timeout);
                }
                else {
                    setTimeout(function () {
                        db.connections.push(connection);
                        openDBRequest.__success(connection);
                    }, timeout);
                }
            }
            return openDBRequest;
        };
        function DeleteDatabase(name){
            var request = new IDBOpenDBRequest(null, null);
            for(var database in this.dbs)
            {
                if(database === name)
                {
                    this.dbs[database] = undefined;
                    delete this.dbs[database];
                }
            }

            setTimeout(function(){
                request.__success();
            }, timeout);

            return request;
        };
        function Cmp(first, second) {
            if(typeof first === 'number' && typeof second === 'number' || typeof first === 'string' && typeof second === 'string' || first instanceof Date && second instanceof Date || first instanceof Array && second instanceof Array){
                if(first instanceof Array && second instanceof Array){
                    first = first.sort(Cmp);
                    second = second.sort(Cmp);
                    var length = first.length < second.length ? first.length : second.length;
                    for (var i = 0; i < length; i++) {
                        if ( first[i] < second[i] ){
                            return -1;
                        }
                        if ( first[i] > second[i] ){
                            return 1;
                        }
                    }
                    if (first.length < second.length){
                        return -1;
                    }
                    if (first.length > second.length){
                        return 1;
                    }
                    return 0;
                }
                else{
                    if ( first < second ){
                        return -1;
                    }
                    if ( first > second ){
                        return 1;
                    }
                    return 0;
                }
            }
            else if(first instanceof Array){
                return 1;
            }
            else if(second instanceof Array){
                return -1;
            }
            else if(typeof first === 'string'){
                return 1;
            }
            else if(typeof second === 'string'){
                return -1;
            }
            else if(first instanceof Date){
                return 1;
            }
            else{
                return -1;
            }
        };

        return {
            open: Open,
            deleteDatabase: DeleteDatabase,
            cmp: Cmp
        }
    })();

    return IDBFactory;
});