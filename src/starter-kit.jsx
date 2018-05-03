/*jshint esversion: 6 */
/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from 'cockpit';
import React from 'react';

/***
 * varlink protocol helpers
 * https://github.com/varlink/varlink.github.io/wiki
 */

const encoder = cockpit.utf8_encoder();
const decoder = cockpit.utf8_decoder(true);

function varlinkCall(channel, method, parameters) {
    return new Promise((resolve, reject) => {
        function on_message(event, data) {
            channel.removeEventListener("message", on_message);

            // FIXME: support answer in multiple chunks until null byte
            if (data[data.length - 1] != 0) {
                reject("protocol error: expecting terminating 0");
                return;
            }

            var reply = decoder.decode(data.slice(0, -1));
            var json = JSON.parse(reply);
            if (json.parameters)
                resolve(json.parameters)
            else if (json.error)
                reject(json.error)
            else
                reject("protocol error: reply has neither parameters nor error: " + reply);
        }

        channel.addEventListener("message", on_message);
        channel.send(encoder.encode(JSON.stringify({ method, parameters: (parameters || {}) })));
        channel.send([0]); // message separator
    });
}


export class StarterKit extends React.Component {
    constructor() {
        super();

        let podman = cockpit.channel({
            payload: "stream",
            unix: "/run/io.projectatomic.podman",
            binary: true,
        });

        varlinkCall(podman, "io.projectatomic.podman.GetVersion")
            .then(reply => this.setState({ version: reply.version }))
            .catch(ex => console.error("Failed to do GetVersion call:", JSON.stringify(ex)));
    }

    render() {
        return (
            <div className="container-fluid">
                <h2>Podman Varlink Demo</h2>
                <div>
                    <span>podman version: {this.state.version ? this.state.version.version : "unknown"}</span>
                </div>
            </div>
        );
    }
}
