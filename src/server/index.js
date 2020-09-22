const fs = require('fs');
const _ = require('lodash');
const express = require('express');
let app = express();
app.use(express.urlencoded())
var io = require('socket.io')(3000);

const jobsList = [
    { tag: "airpollution", count: 500, status: 'waiting' },
    { tag: "climate", count: 500, status: 'waiting' },
    { tag: "extinctionrebellion", count: 500, status: 'waiting' },
    { tag: "climateaction", count: 500, status: 'waiting' },
    { tag: "climatechange", count: 500, status: 'waiting' },
    { tag: "plasticpollution", count: 500, status: 'waiting' },
    { tag: "climatecrisis", count: 500, status: 'waiting' },
    { tag: "climateemergency", count: 500, status: 'waiting' },
    { tag: "covid19", count: 500, status: 'waiting' },
    { tag: "ecofriendly", count: 500, status: 'waiting' },
    { tag: "ecology", count: 500, status: 'waiting' },
    { tag: "ecosystem", count: 500, status: 'waiting' },
    { tag: "environment", count: 500, status: 'waiting' },
    { tag: "environment", count: 500, status: 'waiting' },
    { tag: "environmental", count: 500, status: 'waiting' },
    { tag: "environmentalism", count: 500, status: 'waiting' },
    { tag: "environmentaljustice", count: 500, status: 'waiting' },
    { tag: "environmentallyfriendly", count: 500, status: 'waiting' },
    { tag: "extintionrebellion", count: 500, status: 'waiting' },
    { tag: "globalclimatestrike", count: 500, status: 'waiting' },
    { tag: "globalwarming", count: 500, status: 'waiting' },
    { tag: "plasticfreejuly2020", count: 500, status: 'waiting' },
    { tag: "pollution", count: 500, status: 'waiting' },
    { tag: "protectourplanet", count: 500, status: 'waiting' },
    { tag: "reducereuserecycle", count: 500, status: 'waiting' },
    { tag: "reducewaste", count: 500, status: 'waiting' },
    { tag: "savetheearth", count: 500, status: 'waiting' },
    { tag: "savetheplanet", count: 500, status: 'waiting' },
    { tag: "sustainable", count: 500, status: 'waiting' },
    { tag: "sustainableliving", count: 500, status: 'waiting' }
];

let jobs = jobsList;
let jobCount = jobs.length;
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
        jobCount--;
        finishJob(socket.id, data);
        let selectedJob = grabJob();
        if (selectedJob != null) {
            selectedJob["status"] = 'started';
            selectedJob["workerId"] = socket.id;
            socket.emit('employment', selectedJob);
        }
        clients[socket.id].status = 'idle';
        if (jobCount <= 0) {
            jobs.push(...jobsList);
            jobCount = jobsList.length;
        }
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
    if (jobs.length > 150) {
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
            
                <button type="submit">Run Again</button>
            </form>
        </body>
    </html>
    `;
    res.send(html);

});

app.post("/", (req, res) => {
    jobs.push(...jobsList);
    addJob(jobsList[0].tag, jobsList[0].count);
    res.redirect("/");
})

app.listen(process.env.PORT || 8123);
