# Events
1. Client -> Server: connection - Tells the server that a new client has joined
2. Server -> Client: whoareyou - Asks client to identify
3. Client -> Server: iam - Tells server its identity as well as job status {friendlyName: 'CLI Client 01', status: false}

4. Server -> Client: employment - Tells client what its next job is {job: {id: 12153252345, tag: '#env', count: 20}, persistant: false}
5. Client -> Server: clockout - Returns Job result to server {job: {id: 12324325245, data: {}, tag: ""}}
