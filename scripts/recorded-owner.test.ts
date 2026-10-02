import assert from 'node:assert/strict';
import { recordedOwnerContacts } from '../src/lib/recordedOwner';
assert.deepEqual(recordedOwnerContacts('MORALES LUIS G MARIN/PERALES NUBIA CARBAJAL').map(({firstName,lastName})=>({firstName,lastName})), [{firstName:'LUIS',lastName:'MORALES'},{firstName:'NUBIA',lastName:'PERALES'}]);
for (const name of ['RAVEN FAMILY TRUST', 'EXAMPLE HOLDINGS LLC', 'EXAMPLE COMPANY']) {
  assert.deepEqual(recordedOwnerContacts(name), [{sourceName:name,firstName:name,lastName:''}]);
}
assert.deepEqual(recordedOwnerContacts(' /  / '), []);
assert.deepEqual(recordedOwnerContacts('  SMITH   JANE ANN /DOE JOHN  ')[0], {sourceName:'SMITH JANE ANN',firstName:'JANE',lastName:'SMITH'});
assert.equal(recordedOwnerContacts('CHER')[0].firstName, 'CHER');
console.log('Recorded owner parsing: passed');
