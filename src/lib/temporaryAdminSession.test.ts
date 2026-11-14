import { describe, expect, it } from 'vitest';
import { isAdminSessionActorCurrent } from '../../supabase/functions/_shared/temporaryAdminSession';

describe('temporary administrator session revocation',()=>{
  const now=2000000000;
  const configured={TEMP_ADMIN_ID:'qa-fixture',TEMP_ADMIN_CREDENTIAL_SHA256:'a'.repeat(64),TEMP_ADMIN_EXPIRES_AT:String(now+600)};
  const env=(patch:Partial<typeof configured>={})=>(key:string)=>({...configured,...patch})[key as keyof typeof configured];
  it('allows a currently provisioned bounded session',()=>expect(isAdminSessionActorCurrent('qa-fixture',now+600,env(),now)).toBe(true));
  it.each(['TEMP_ADMIN_ID','TEMP_ADMIN_CREDENTIAL_SHA256','TEMP_ADMIN_EXPIRES_AT'] as const)('immediately rejects an issued session when %s is removed',key=>{
    expect(isAdminSessionActorCurrent('qa-fixture',now+600,env({[key]:undefined}),now)).toBe(false);
  });
  it('rejects a previous QA actor and sessions beyond the active deadline',()=>{
    expect(isAdminSessionActorCurrent('qa-old',now+500,env(),now)).toBe(false);
    expect(isAdminSessionActorCurrent('qa-fixture',now+601,env(),now)).toBe(false);
    expect(isAdminSessionActorCurrent('qa-fixture',now,env(),now)).toBe(false);
  });
  it('rejects malformed or overly long temporary configuration',()=>{
    expect(isAdminSessionActorCurrent('qa-fixture',now+600,env({TEMP_ADMIN_EXPIRES_AT:String(now+3601)}),now)).toBe(false);
    expect(isAdminSessionActorCurrent('qa-fixture',now+600,env({TEMP_ADMIN_CREDENTIAL_SHA256:'invalid'}),now)).toBe(false);
  });
  it('preserves existing non-QA administrator sessions',()=>{
    expect(isAdminSessionActorCurrent('existing-admin',now+28800,()=>undefined,now)).toBe(true);
  });
});
