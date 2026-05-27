import React, { useState, useEffect } from 'react';
import { Prize, AccessRequest, WinRecord } from '../types/types';
import AuthPage from '../screen/auth/AuthPage';
import UserWheelPage from '../screen/user/UserWheelPage';
import AdminPortal from '../screen/admin/AdminPortal';
import { db, auth, OperationType, handleFirestoreError } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';

const defaultPrizes: Prize[] = [
  { id: '1', label: 'item', probability: 100.0, color: '#F4EBD0', textColor: '#775a19', status: 'نشط' },
];

const defaultRequests: AccessRequest[] = [];
export default function App() {
  const [prizes, setPrizes] = useState<Prize[]>(defaultPrizes);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(defaultRequests);
  const [wins, setWins] = useState<WinRecord[]>([]);
  const [currentRole, setCurrentRole] = useState<'visitor' | 'admin' | 'user'>('visitor');
  const [totalDistributed, setTotalDistributed] = useState(0);

  useEffect(() => {
    const unsubscribeInit = onAuthStateChanged(auth, (user) => {
      unsubscribeInit();
      if (user && !user.isAnonymous) {
        return;
      }
      localStorage.removeItem('bypass_email');
      localStorage.removeItem('bypass_name');
      if (user) {
        signOut(auth).catch(err => console.error("Initial sign out failed:", err));
      }
    });
  }, []);

  useEffect(() => {
    let unsubPrizes: (() => void) | undefined;
    let unsubWins: (() => void) | undefined;
    let unsubStats: (() => void) | undefined;
    let unsubRequests: (() => void) | undefined;

    const cleanupActiveSubscriptions = () => {
      if (unsubPrizes) {
        unsubPrizes();
        unsubPrizes = undefined;
      }
      if (unsubWins) {
        unsubWins();
        unsubWins = undefined;
      }
      if (unsubStats) {
        unsubStats();
        unsubStats = undefined;
      }
      if (unsubRequests) {
        unsubRequests();
        unsubRequests = undefined;
      }
    };

    const unsubscribeOuterAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupActiveSubscriptions();

      if (firebaseUser) {
        unsubPrizes = onSnapshot(collection(db, 'prizes'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(changeDoc => changeDoc.data() as Prize);
            
            const oldDefaultIds = ['2', '3', '4', '5', '6', '7', '8'];
            const hasOldPrizes = list.some(p => oldDefaultIds.includes(p.id));
            if (hasOldPrizes) {
              list.forEach(async (p) => {
                if (oldDefaultIds.includes(p.id)) {
                  try {
                    await deleteDoc(doc(db, 'prizes', p.id));
                  } catch (err) {
                    console.error("Failed to delete stale default prize: " + p.id, err);
                  }
                }
              });
            }

            const filteredList = list.filter(p => !oldDefaultIds.includes(p.id));
            filteredList.sort((a, b) => {
              const numA = Number(a.id);
              const numB = Number(b.id);
              const isNumA = !isNaN(numA);
              const isNumB = !isNaN(numB);
              if (isNumA && isNumB) {
                return numA - numB;
              }
              if (isNumA) return -1;
              if (isNumB) return 1;
              return a.id.localeCompare(b.id);
            });
            setPrizes(filteredList);
          } else {
            defaultPrizes.forEach(async (p) => {
              try {
                await setDoc(doc(db, 'prizes', p.id), p);
              } catch (err) {
                console.error("Failed to bootstrap prize " + p.id, err);
              }
            });
          }
        }, (error) => {
          console.error("Error watching prizes:", error);
        });

        const email = firebaseUser.email?.trim().toLowerCase() || localStorage.getItem('bypass_email') || '';

        if (email === 'Sbeihmorad07@gmail.com') {
          unsubWins = onSnapshot(collection(db, 'wins'), (snapshot) => {
            const list = snapshot.docs.map(changeDoc => changeDoc.data() as WinRecord);
            list.sort((a, b) => b.id.localeCompare(a.id));
            setWins(list);
            
            const calculatedSum = list.reduce((total, item) => total + (item.valueAssumed || 0), 0);
            setTotalDistributed(calculatedSum);
          }, (error) => {
            console.error("Error watching wins collection:", error);
          });
        } else if (email) {
          unsubWins = onSnapshot(query(collection(db, 'wins'), where('email', '==', email)), (snapshot) => {
            const list = snapshot.docs.map(changeDoc => changeDoc.data() as WinRecord);
            list.sort((a, b) => b.id.localeCompare(a.id));
            setWins(list);
          }, (error) => {
            console.error("Error watching personal wins:", error);
          });

          unsubStats = onSnapshot(doc(db, 'stats', 'dashboard'), (snap) => {
            if (snap.exists()) {
              setTotalDistributed(snap.data().totalDistributed || 0);
            }
          }, (error) => {
            console.error("Error watching stats dashboard:", error);
          });
        }

        if (email === 'Sbeihmorad07@gmail.com') {
          setCurrentRole('admin');
          unsubRequests = onSnapshot(collection(db, 'accessRequests'), (snapshot) => {
            const list = snapshot.docs.map(changeDoc => changeDoc.data() as AccessRequest);
            setAccessRequests(list);
          }, (error) => {
            console.error("Error watching requests:", error);
          });
        } else {
          if (email) {
            unsubRequests = onSnapshot(doc(db, 'accessRequests', email), (snap) => {
              if (snap.exists()) {
                const data = snap.data() as AccessRequest;
                if (data.status === 'مقبول') {
                  setCurrentRole(prev => prev === 'admin' ? 'admin' : 'user');
                } else {
                  setCurrentRole(prev => prev === 'admin' ? 'admin' : 'visitor');
                }
                setAccessRequests([data]);
              } else {
                setCurrentRole(prev => prev === 'admin' ? 'admin' : 'visitor');
                setAccessRequests([]);
              }
            }, (error) => {
              console.error("Error watching personal request:", error);
            });
          }
        }
      } else {
        localStorage.removeItem('bypass_email');
        localStorage.removeItem('bypass_name');
        setCurrentRole('visitor');
        setPrizes(defaultPrizes);
        setAccessRequests([]);
      }
    });

    return () => {
      unsubscribeOuterAuth();
      cleanupActiveSubscriptions();
    };
  }, []);

  const handleAddPrize = async (newPrize: Prize) => {
    try {
      await setDoc(doc(db, 'prizes', newPrize.id), newPrize);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `prizes/${newPrize.id}`);
    }
  };

  const handleEditPrize = async (id: string, updatedFields: Partial<Prize>) => {
    try {
      const finalFields = id === '1' ? { ...updatedFields, status: 'نشط' as const } : updatedFields;
      await updateDoc(doc(db, 'prizes', id), finalFields);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `prizes/${id}`);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (id === '1') {
      console.warn("Attempted to delete the protected primary default prize.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'prizes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `prizes/${id}`);
    }
  };

  const handleAddAccessRequest = async (request: Partial<AccessRequest>) => {
    const cleanEmail = request.email?.trim().toLowerCase() || '';
    if (!cleanEmail) return;

    const freshReq: AccessRequest = {
      id: `req_${Math.random().toString(36).substring(2, 9)}`,
      firstName: request.firstName || 'مجهول',
      lastName: request.lastName || 'مجهول',
      email: cleanEmail,
      purpose: request.purpose || 'تسجيل دخول وتفعيل تلقائي  عبر Google',
      status: 'قيد الانتظار',
      requestDate: new Date().toLocaleDateString('ar-EG'),
      position: request.position || 'عضو طامح'
    };

    try {
      await setDoc(doc(db, 'accessRequests', cleanEmail), freshReq);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `accessRequests/${cleanEmail}`);
    }
  };

  const handleUpdateAccessRequest = async (idOrEmail: string, status: 'مقبول' | 'مرفوض') => {
    try {
      let docId = idOrEmail;
      if (!idOrEmail.includes('@')) {
        const found = accessRequests.find(r => r.id === idOrEmail);
        if (found) {
          docId = found.email;
        }
      }
      await updateDoc(doc(db, 'accessRequests', docId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accessRequests/${idOrEmail}`);
    }
  };

  const handleDeleteAccessRequest = async (idOrEmail: string) => {
    try {
      let docId = idOrEmail;
      if (!idOrEmail.includes('@')) {
        const found = accessRequests.find(r => r.id === idOrEmail);
        if (found) {
          docId = found.email;
        }
      }
      await deleteDoc(doc(db, 'accessRequests', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accessRequests/${idOrEmail}`);
    }
  };

  const handleRecordWin = async (prizeLabel: string, valueAssumed: number, customerName?: string, customerPhone?: string) => {
    try {
      const winId = `win_${Date.now()}`;
      const currentUser = auth.currentUser;
      const email = currentUser?.email || localStorage.getItem('bypass_email') || 'visitor@goldspin.vip';
      const displayName = currentUser?.displayName || localStorage.getItem('bypass_name') || 'عضو بمجتمع جولدن';
      
      const winRecord: WinRecord = {
        id: winId,
        email,
        displayName,
        prizeLabel,
        valueAssumed,
        winDate: new Date().toLocaleString('ar-EG'),
        customerName: customerName || '',
        customerPhone: customerPhone || ''
      };

      await setDoc(doc(db, 'wins', winId), winRecord);

      await setDoc(doc(db, 'stats', 'dashboard'), {
        totalDistributed: totalDistributed + valueAssumed,
        increasePercentage: 12.5
      });
    } catch (error) {
      console.error("Error saving win record to Firebase:", error);
    }
  };

  const handleDeleteWin = async (id: string, valueAssumed: number) => {
    try {
      await deleteDoc(doc(db, 'wins', id));
      
      const docRef = doc(db, 'stats', 'dashboard');
      await setDoc(docRef, {
        totalDistributed: Math.max(0, totalDistributed - valueAssumed),
        increasePercentage: 12.5
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wins/${id}`);
    }
  };

  const handleLoginSuccess = (role: 'admin' | 'user') => {
    setCurrentRole(role);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('bypass_email');
      localStorage.removeItem('bypass_name');
      await signOut(auth);
      setCurrentRole('visitor');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const loggedInUserName = auth.currentUser?.displayName || localStorage.getItem('bypass_name') || 'عضو مميز';
  const loggedInUserEmail = auth.currentUser?.email || localStorage.getItem('bypass_email') || '';

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col relative select-none">
      
      {/* Main Interaction Screen Router */}
      <div className="flex-grow flex items-center justify-center p-4">
        {currentRole === 'visitor' && (
          <AuthPage 
            onLoginSuccess={handleLoginSuccess}
            onRequestAccess={handleAddAccessRequest}
            onBackToWheel={() => setCurrentRole('user')}
            accessRequests={accessRequests}
          />
        )}

        {currentRole === 'user' && (
          <UserWheelPage 
            prizes={prizes}
            onLogout={handleLogout}
            onRecordWin={handleRecordWin}
            onAdminLoginClick={() => setCurrentRole('visitor')}
            userDisplayName={loggedInUserName}
            userEmail={loggedInUserEmail}
          />
        )}

        {currentRole === 'admin' && (
          <AdminPortal
            prizes={prizes}
            accessRequests={accessRequests}
            onAddPrize={handleAddPrize}
            onEditPrize={handleEditPrize}
            onDeletePrize={handleDeletePrize}
            onUpdateAccessRequest={handleUpdateAccessRequest}
            onDeleteAccessRequest={handleDeleteAccessRequest}
            onLogout={handleLogout}
            totalStats={{ totalDistributed }}
            wins={wins}
            onDeleteWin={handleDeleteWin}
          />
        )}
      </div>

    </div>
  );
}
