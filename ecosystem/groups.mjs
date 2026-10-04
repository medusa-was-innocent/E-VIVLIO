import { randomBytes, randomUUID } from 'node:crypto';
export function installGroups(app, db, route) {
  const member = async user => (await db.query('SELECT g.id,g.name,g.invite FROM ecosystem_groups g JOIN ecosystem_group_members m ON m.group_id=g.id WHERE m.user_id=$1',[user])).rows[0];
  app.get('/api/ecosystem/group', route(async (req,res) => {
    const group = await member(req.user.id);
    if (!group) return res.json({group:null,events:[]});
    const events = (await db.query('SELECT e.id::text,e.user_id,u.name,e.body,e.app,e.code,e.created_at FROM ecosystem_group_events e JOIN "user" u ON u.id=e.user_id WHERE e.group_id=$1 ORDER BY e.id DESC LIMIT 80',[group.id])).rows.reverse();
    res.json({group,events,userId:req.user.id});
  }));
  app.post('/api/ecosystem/group', route(async(req,res) => {
    if (await member(req.user.id)) return res.status(409).json({error:'Leave your current group first.'});
    const invite = req.body.invite;
    if (invite !== undefined) {
      if (typeof invite !== 'string' || !/^[a-f0-9]{24}$/.test(invite.trim())) return res.status(400).json({error:'Enter a valid group code.'});
      const group = (await db.query('SELECT id FROM ecosystem_groups WHERE invite=$1',[invite.trim()])).rows[0];
      if (!group) return res.status(404).json({error:'Group not found.'});
      await db.query('INSERT INTO ecosystem_group_members(user_id,group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[req.user.id,group.id]);
    } else {
      const name = req.body.name;
      if (typeof name !== 'string' || !name.trim() || name.length>50) return res.status(400).json({error:'Enter a group name (up to 50 characters).'});
      await db.query('WITH g AS (INSERT INTO ecosystem_groups(id,name,invite) VALUES ($1,$2,$3) RETURNING id) INSERT INTO ecosystem_group_members(user_id,group_id) SELECT $4,id FROM g',[randomUUID(),name.trim(),randomBytes(12).toString('hex'),req.user.id]);
    }
    res.status(201).json({ok:true});
  }));
  app.delete('/api/ecosystem/group', route(async(req,res) => {
    await db.query('DELETE FROM ecosystem_group_members WHERE user_id=$1',[req.user.id]);
    res.status(204).end();
  }));
  app.post('/api/ecosystem/group/messages', route(async(req,res) => {
    const group = await member(req.user.id);
    if (!group) return res.status(403).json({error:'Join a group first.'});
    const body=req.body.body;
    if (typeof body !== 'string' || !body.trim() || body.length>1000) return res.status(400).json({error:'Messages must contain 1–1000 characters.'});
    const sent=await db.query("INSERT INTO ecosystem_group_events(group_id,user_id,body) SELECT $1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM ecosystem_group_events WHERE user_id=$2 AND app IS NULL AND created_at > now()-interval '1 second') RETURNING id",[group.id,req.user.id,body.trim()]);
    if (!sent.rows.length) return res.status(429).json({error:'Please wait a moment before sending again.'});
    res.status(201).json({ok:true});
  }));
}
export async function announceRoom(db,user,app,code) {
  await db.query(`INSERT INTO ecosystem_group_events(group_id,user_id,app,code)
    SELECT m.group_id,m.user_id,r.app,r.code FROM ecosystem_group_members m
    JOIN ecosystem_rooms r ON r.created_by=m.user_id
    WHERE m.user_id=$1 AND r.app=$2 AND r.code=$3
    AND r.created_at > now()-interval '5 minutes'
    ON CONFLICT(group_id,app,code) DO NOTHING`,[user,app,code]);
}
