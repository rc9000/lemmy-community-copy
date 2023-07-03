# Lemmy Community-Following Synchronizer

Uses the `lemmy-js-client` library to synchronise communities (subs) between two instances of Lemmy, a free, open-source and federated link aggregation platform. 

## Usage

    git clone https://github.com/rc9000/lemmy-community-copy.git \
        && cd lemmy-community-copy && npm install

    ./node_modules/.bin/ts-node main.ts \
        --from-url 'https://sh.itjust.works' --from-username 'userA' --from-password 'abc' \
        --to-url   'https://feddit.de'       --to-username   'userB' --to-password   'xyz'

Afterwards, `userB` will follow all communities available on the `to-url` instance. Watch out for output lines like this:

    FIXME: community https://dataterm.digital/c/cyberpunk missing on TO - to make known to instance, search for it with https://feddit.de/search?q=https://dataterm.digital/c/cyberpunk

This means that the community does not yet have an id in the target instance. Just searching for it by copying the link into your browser (while logged in into the `to-url` instance) should fix it. There is certainly an automated way to do this, but I haven't gotten around to look into it.






