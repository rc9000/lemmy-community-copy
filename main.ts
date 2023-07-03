import { LemmyHttp, Login, ListCommunities, Community } from 'lemmy-js-client';
import log from 'loglevel';
import { Command } from 'commander';
const program = new Command();


program
  .requiredOption('--from-url <fromUrl>', 'URL of the source instance')
  .requiredOption('--from-username <fromUsername>', 'Username for the source instance')
  .requiredOption('--from-password <fromPassword>', 'Password for the source instance')
  .requiredOption('--to-url <toUrl>', 'URL of the destination instance')
  .requiredOption('--to-username <toUsername>', 'Username for the destination instance')
  .requiredOption('--to-password <toPassword>', 'Password for the destination instance')
  .option('--loglevel <level>', 'Loglevel: debug/info/warn', "debug")
  .option('--maxpages <number>', 'Max pages to request while getting communities', "1000")
  .option('--pagesize <number>', 'Entries per page to request while getting communities', "30")
  .parse(process.argv);

const opt = program.opts();
log.setLevel(opt.loglevel ? opt.loglevel : "debug");
let pagesize = opt.pagesize;
let maxpages = opt.maxpages;

let clientFrom: LemmyHttp = new LemmyHttp(opt.fromUrl);
let loginFormFrom: Login = { username_or_email: opt.fromUsername, password: opt.fromPassword };
let clientTo: LemmyHttp = new LemmyHttp(opt.toUrl);
let loginFormTo: Login = { username_or_email: opt.toUsername, password: opt.toPassword };

async function fetchCommunities(client: LemmyHttp, jwt: string, type_: "Subscribed" | "All") {
  let communities: Community[] = [];
  let currpage = 1;

  while (currpage <= maxpages){
    log.debug(`fetching page ${currpage} of up to ${maxpages}`);
    let c = await client.listCommunities({limit: pagesize, auth: jwt, type_, page: currpage, sort: "Old" });

    if (c.communities.length == 0){
      log.debug(`no more data in page`);
      break;
    }

    communities.push(...c.communities.map(community => community.community));
    currpage++;
  }
  
  return communities;
}

(async () => {
  try {
    log.info(`\n\nlogging into ${opt.fromUrl} to list followed communities...\n\n`);

    let jwtFrom = await clientFrom.login(loginFormFrom);
    let subs = await fetchCommunities(clientFrom, jwtFrom.jwt!, "Subscribed");

    log.info(`\n\nlogging into ${opt.toUrl} to list communities...\n\n`);

    let jwtTo = await clientTo.login(loginFormTo);
    let destCommunities = await fetchCommunities(clientTo, jwtTo.jwt!, "All");
    let destMap: { [key: string]:  Community;  } = {}; 

    for (const community of destCommunities) {
      log.debug(`TO: ${community.actor_id} has id ${community.id}` );
      destMap[community.actor_id] = community; 
    }

    log.info(`\n\nfollowing communities on ${opt.toUrl}...\n\n`);

    for (const s of subs) {
      let t = destMap[s.actor_id];
      if (t){
        log.info(`following ${s.actor_id} on TO with id ${t.id}`);
        let fres = await clientTo.followCommunity({ auth: jwtTo.jwt!, community_id: t.id, follow: true});
      }else{
        // I'm sure there is an API-based way to do that, FIXME
        log.error(`FIXME: community ${s.actor_id} missing on TO - to make known to instance, search for it with ${opt.toUrl}/search?q=${s.actor_id}`);
      }
    }

  } catch (error) {
    log.error(error);
  }
})();
