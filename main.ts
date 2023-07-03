import { LemmyHttp, Login, ListCommunities, Community } from 'lemmy-js-client';
import log from 'loglevel';
import { Command } from 'commander';
const program = new Command();

log.setLevel("debug");
let pagesize = 30;
let maxpages = 1000;

program
  .requiredOption('--from-url <fromUrl>', 'URL of the source instance')
  .requiredOption('--from-username <fromUsername>', 'Username for the source instance')
  .requiredOption('--from-password <fromPassword>', 'Password for the source instance')
  .requiredOption('--to-url <toUrl>', 'URL of the destination instance')
  .requiredOption('--to-username <toUsername>', 'Username for the destination instance')
  .requiredOption('--to-password <toPassword>', 'Password for the destination instance')
  .parse(process.argv);

const opt = program.opts();
console.log(opt);

let clientFrom: LemmyHttp = new LemmyHttp(opt.fromUrl);
let loginFormFrom: Login = { username_or_email: opt.fromUsername, password: opt.fromPassword };

let clientTo: LemmyHttp = new LemmyHttp(opt.toUrl);
let loginFormTo: Login = { username_or_email: opt.toUsername, password: opt.toPassword };

(async () => {
  try {

    let subs: Community[] = [];
    let subMap: { [key: string]:  Community;  } = {}; 
    let jwtFrom = await clientFrom.login(loginFormFrom);

    let currpage = 1;

    while (currpage <= maxpages){
      log.debug(`Looking at subscription page ${currpage} of ${maxpages}`);
      let c = await clientFrom.listCommunities({limit: pagesize, auth: jwtFrom.jwt, type_: "Subscribed", page: currpage, sort: "Old" });

      if (c.communities.length == 0){
        log.debug(`list of communities exhausted`);
        break;
      }

      for (const community of c.communities) {
        log.info(`FROM: adding ${community.community.actor_id}`);
        subs.push(community.community);
        subMap[community.community.actor_id] = community.community; 
      }

      currpage++;
    }

    currpage = 1;

    let jwtTo = await clientTo.login(loginFormTo);
    let destCommunitites: Community[] = [];
    let destMap: { [key: string]:  Community;  } = {}; 

    while (currpage <= maxpages){
      let cTo = await clientTo.listCommunities({limit: pagesize, auth: jwtTo.jwt, page: currpage, sort: "Old" });

      if (cTo.communities.length == 0){
        log.debug(`list of communities exhausted`);
        break;
      }

      for (const community of cTo.communities) {
        log.info(`TO: adding ${community.community.actor_id}`);
        //log.debug(`community.community.id ${community.community.id}`);
        destCommunitites.push(community.community);
        destMap[community.community.actor_id] = community.community; 
      }

      currpage++;
    }

    for (const s of subs) {
      let t = destMap[s.actor_id];
      if (t){
        console.log(`subbing to ${s.actor_id} on FROM with id ${t.id}`);
        let fres = await clientTo.followCommunity({ auth: jwtTo.jwt!, community_id: t.id, follow: true});
      }else{
        console.log(`community ${s.actor_id} missing on TO - search for it to federate with instance`);
      }

    }

  } catch (error) {
    log.error(error);
  }
})();



