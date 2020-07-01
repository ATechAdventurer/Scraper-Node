const fs = require('fs');
const _ = require('lodash');
const express = require('express');
let app = express();
app.use(express.urlencoded())
var io = require('socket.io')(3000);

let jobs = [{ tag: "test", count: 1, status: 'waiting' }, { tag: "eco", count: 15, status: 'waiting' }, { tag: "economy", count: 15, status: 'waiting' }];
let clients = {};
io.on('connection', (socket) => {
    console.log("Client has joined");
    console.log("Asking Client to identify itself");
    socket.emit('whoareyou');
    socket.on('iam', (data) => {
        const { friendlyName } = data;
        console.log("iam recived", friendlyName, "Assigned the sid:", socket.id);
        let existingDevice = { found: false };
        Object.keys(clients).forEach(clientID => {
            if (clients[clientID].friendlyName == friendlyName && clients[clientID].status == 'offline') {
                existingDevice = { found: true, id: clientID };
                return;
            }
        })
        if (existingDevice.found) {
            console.log("Found an old client rejoining")
            delete clients[existingDevice.id];
        }
        clients[socket.id] = { friendlyName, socket, status: "idle" };
        //console.log(clients);

        tryToEmploy(socket.id);
    });

    socket.on('clockout', (data) => {
        console.log("Client sent over job data", data);
        finishJob(socket.id, data);
        let selectedJob = grabJob();
        if (selectedJob != null) {
            selectedJob["status"] = 'started';
            selectedJob["workerId"] = socket.id;
            socket.emit('employment', selectedJob);
        }
        clients[socket.id].status = 'idle';
    });

    socket.on('pester', () => {
        console.log(clients[socket.id].friendlyName, "is pestering for a new job")
        tryToEmploy(socket.id);
    });

    socket.on('disconnect', () => {
        console.log("A client Disconnected");
        killZombieProcesses(socket.id);
        clients[socket.id].status = "offline";
        clients[socket.id].socket = null;
        //console.log(clients);
    })
});


function grabJob() {
    let readyJobs = jobs.filter(({ status }) => {
        return status == "waiting";
    });
    return readyJobs[0] || null;
}

function killZombieProcesses(id) {
    let zombieJobs = jobs.filter((job) => {
        //console.log(job.workerId, "==", id)
        return job.workerId == id && job.status == 'started';
    }).forEach((job) => {
        job.status = "waiting";
        delete job.workerId;
    })
    //console.log("All Jobs:\n", jobs);
}

function finishJob(id, data) {
    let ownedJobs = jobs.filter((job) => {
        return job.workerId == id;
    }).forEach((job) => {
        if (fs.existsSync(`${job.tag}.json`)) {
            const oldData = JSON.parse(fs.readFileSync(`${job.tag}.json`));
            fs.writeFileSync(`${job.tag}.json`, JSON.stringify(reconsiler(oldData, data)));
        } else {
            fs.writeFileSync(`${job.tag}.json`, JSON.stringify(data));
        }
        job.status = 'finished';
    });
    // TODO: Solve this more gracefully
    if (jobs.length > 25) {
        jobs = jobs.filter((job) => {
            return job.status == 'finished';
        })
    }
}

function reconsiler(oldData, newData) {
    let data = [...oldData, ...newData];
    return _.uniqBy(data, 'post_hash');
}

function addJob(tag, count) {
    //console.log(clients);
    /*let idleClients = clients.filter((client) => {
        return client.status == 'idle';
    });*/

}

function tryToEmploy(id) {
    const socket = clients[id].socket;
    let selectedJob = grabJob();
    if (selectedJob != null) {
        selectedJob["status"] = 'started';
        selectedJob["workerId"] = socket.id;
        socket.emit('employment', selectedJob);
        clients[socket.id].status = 'working';
    }
}



app.get("/", (req, res) => {
    let html = `
    <html>
        <body>
            <h1>Jobs:</h1>
            <ol>
                ${
        (() => {
            let data = "";
            jobs.forEach(job => {
                data += `<li>${job.tag} - ${job.status}</li>`;
            })
            return data;
        })()
        }
            </ol>
            <h1>Clients:</h1>
            <ol>
                ${
        (() => {
            let data = "";
            Object.keys(clients).filter(clientID => {
                const client = clients[clientID];
                return client.status != 'offline';
            }).forEach(clientID => {
                const client = clients[clientID];
                data += `<li>${client.friendlyName}</li>`;
            })
            return data;
        })()
        }
            </ol>
            <form action="/" method="POST">
                <input type="text" name="tag" />
                <input type="text" name="count" />
                <button type="submit">Submit</button>
            </form>
        </body>
    </html>
    `;
    res.send(html);

});

app.post("/", (req, res) => {
    const { tag = null, count = null } = req.body;
    jobs.push({ tag, count, status: 'waiting' });
    addJob(tag, count);
    res.redirect("/");
})

app.listen(process.env.PORT || 80);