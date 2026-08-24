import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  MessageSquare, 
  Video, 
  Mail, 
  Check, 
  Copy, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  MoreVertical,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useRouter } from '../../context/RouterContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Contact, User as AppUser } from '../../types';

export const ContactsPage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOnline, setFilterOnline] = useState<boolean>(false);

  // Real Registered Firebase Users state for live status mapping
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, AppUser>>({});

  // Add Contact Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [searchingUsers, setSearchingUsers] = useState<boolean>(false);
  const [foundUsers, setFoundUsers] = useState<AppUser[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Quick Action feedback
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Close dropdown on outside click
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // 1. Subscribe to current user's contacts
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Contact[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Contact);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(list);
      setLoading(false);
    }, (err) => {
      console.warn('[Contacts] Error fetching contacts:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // 2. Subscribe to real registered users in Firestore to provide live online presence
  useEffect(() => {
    if (!user?.id) return;

    try {
      const q = query(collection(db, 'users'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const map: Record<string, AppUser> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          map[docSnap.id] = {
            id: docSnap.id,
            name: data.name || 'User',
            email: data.email || '',
            avatar: data.avatar || undefined,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          };
        });
        setRegisteredUsers(map);
      }, (err) => {
        console.warn('[Contacts] Users presence query error:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Presence snapshot error:', e);
    }
  }, [user?.id]);

  // Determine online status based on real presence & lastSeen
  const getContactPresence = (contact: Contact) => {
    const targetUserId = contact.contactUserId;
    if (!targetUserId) {
      return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
    }

    const regUser = registeredUsers[targetUserId];
    if (!regUser) {
      return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
    }

    if (regUser.isOnline) {
      return { isOnline: true, statusText: 'Online Now', labelClass: 'text-emerald-600 font-semibold' };
    }

    if (regUser.lastSeen) {
      try {
        const time = regUser.lastSeen.toDate ? regUser.lastSeen.toDate() : new Date(regUser.lastSeen);
        const diffMinutes = Math.floor((Date.now() - time.getTime()) / (1000 * 60));
        if (diffMinutes < 5) {
          return { isOnline: true, statusText: 'Active recently', labelClass: 'text-emerald-600 font-medium' };
        }
        if (diffMinutes < 60) {
          return { isOnline: false, statusText: `${diffMinutes}m ago`, labelClass: 'text-[#8ca18f]' };
        }
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
          return { isOnline: false, statusText: `${diffHours}h ago`, labelClass: 'text-[#8ca18f]' };
        }
        return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
      } catch (e) {}
    }

    return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
  };

  // Search real authenticated users from Firestore
  const handleSearchRegisteredUsers = async (queryText: string) => {
    setUserSearchQuery(queryText);
    if (!queryText.trim()) {
      setFoundUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      // Query users collection
      const q = query(collection(db, 'users'), limit(50));
      const snap = await getDocs(q);
      const results: AppUser[] = [];
      const lowerQ = queryText.trim().toLowerCase();

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;
        // Don't show current logged in user in search results
        if (uid === user?.id) return;

        const name = (data.name || '').toLowerCase();
        const email = (data.email || '').toLowerCase();

        if (name.includes(lowerQ) || email.includes(lowerQ)) {
          results.push({
            id: uid,
            name: data.name || 'User',
            email: data.email || '',
            avatar: data.avatar || undefined,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          });
        }
      });

      setFoundUsers(results);
    } catch (err) {
      console.error('Error searching registered users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Check if a real user is already in contacts
  const isUserInContacts = (targetUserId: string, targetEmail: string) => {
    return contacts.some(
      (c) => c.contactUserId === targetUserId || (c.email && c.email.toLowerCase() === targetEmail.toLowerCase())
    );
  };

  // Add real user as contact
  const handleAddRealUserToContacts = async (targetUser: AppUser) => {
    if (!user?.id) return;
    setAddingUserId(targetUser.id);
    try {
      await addDoc(collection(db, 'contacts'), {
        userId: user.id,
        contactUserId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar || null,
        createdAt: serverTimestamp(),
      });

      // Send real notification to the added contact
      if (targetUser.id && targetUser.id !== user.id) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.id,
          type: 'contact',
          title: 'Contact Request / Added',
          message: `${user.name || user.email || 'A user'} added you to their workspace contacts list.`,
          senderName: user.name || 'Workspace User',
          senderAvatar: user.avatar || null,
          actionUrl: '/dashboard/contacts',
          read: false,
          createdAt: serverTimestamp(),
        }).catch((err) => console.warn('Notification emit warning:', err));
      }

      // Clear search
      setUserSearchQuery('');
      setFoundUsers([]);
      setShowAddModal(false);
    } catch (e) {
      console.error('Error adding user to contacts:', e);
    } finally {
      setAddingUserId(null);
    }
  };

  // Delete contact
  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'contacts', contactToDelete.id));
      setContactToDelete(null);
    } catch (e) {
      console.error('Error deleting contact:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy email
  const handleCopyEmail = (emailStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(emailStr);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Navigate to direct chat with user
  const handleStartChatWithContact = (contact: Contact) => {
    if (contact.contactUserId) {
      navigate(`/dashboard/chat?recipientId=${contact.contactUserId}`);
    } else {
      navigate(`/dashboard/chat?email=${encodeURIComponent(contact.email)}`);
    }
  };

  // Filtered Contacts in view
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const presence = getContactPresence(c);
      if (filterOnline && !presence.isOnline) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        return matchName || matchEmail;
      }
      return true;
    });
  }, [contacts, searchQuery, filterOnline, registeredUsers]);

  const onlineCount = useMemo(() => {
    return contacts.filter((c) => getContactPresence(c).isOnline).length;
  }, [contacts, registeredUsers]);

  const getInitials = (contactName: string) => {
    if (!contactName) return 'U';
    const parts = contactName.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit'] tracking-tight">
            Contacts &amp; Directory
          </h2>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-0.5">
            Connect with real registered users, check live presence, and start instant 1:1 chats.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setShowAddModal(true);
              handleSearchRegisteredUsers('');
            }}
            id="add-contact-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-xs rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#e2ede4] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by name or email..."
            className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl pl-9 pr-8 py-2 text-xs text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8ca18f] hover:text-[#1a241b]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Online Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOnline(!filterOnline)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              filterOnline
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-[#f8f9f8] text-[#5a6b5c] border border-[#e2ede4] hover:bg-[#eff5f0]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterOnline ? 'bg-emerald-500 animate-pulse' : 'bg-[#8ca18f]'}`} />
            <span>Online Only ({onlineCount})</span>
          </button>

          <span className="text-xs text-[#8ca18f] px-2 hidden md:inline">
            {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>
      </div>

      {/* 3. Contacts Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#e2ede4] p-5 animate-pulse space-y-3 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#eff5f0]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-[#eff5f0] rounded w-2/3" />
                  <div className="h-3 bg-[#f8f9f8] rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-[#eff5f0] rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto mb-3.5 border border-[#cddfd0]">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#1a241b] font-['Outfit']">
            {searchQuery || filterOnline ? 'No matching contacts found' : 'Your directory is empty'}
          </h3>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery || filterOnline
              ? 'Try adjusting your search query or turn off the online filter.'
              : 'Add registered team members or collaborators to quickly start 1:1 chats and send direct meeting invitations.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {searchQuery || filterOnline ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterOnline(false);
                }}
                className="px-4 py-2 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Search &amp; Add Users</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const presence = getContactPresence(contact);
            const isMenuOpen = activeMenuId === contact.id;

            return (
              <div
                key={contact.id}
                className="bg-white rounded-2xl border border-[#e2ede4] p-5 shadow-2xs hover:border-[#cddfd0] transition-all relative flex flex-col justify-between group"
              >
                {/* Top Section */}
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar with live presence indicator */}
                      <div className="relative shrink-0">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-11 h-11 rounded-2xl object-cover border border-[#e2ede4]"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-[#eff5f0] text-[#3d6e44] font-bold text-sm font-['Outfit'] border border-[#cddfd0] flex items-center justify-center">
                            {getInitials(contact.name)}
                          </div>
                        )}
                        {/* Live Online Badge */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            presence.isOnline ? 'bg-emerald-500' : 'bg-stone-300'
                          }`}
                          title={presence.statusText}
                        />
                      </div>

                      {/* Name and email */}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#1a241b] font-['Outfit'] truncate">
                          {contact.name}
                        </h3>
                        <p className="text-xs text-[#5a6b5c] truncate mt-0.5 flex items-center gap-1">
                          <span>{contact.email}</span>
                          <button
                            onClick={(e) => handleCopyEmail(contact.email, e)}
                            className="text-[#8ca18f] hover:text-[#1a241b] transition-colors p-0.5"
                            title="Copy email"
                          >
                            {copiedEmail === contact.email ? (
                              <Check className="w-3 h-3 text-[#528d5a]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Actions Menu button */}
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : contact.id);
                        }}
                        className="p-1.5 rounded-xl hover:bg-[#f8f9f8] text-[#8ca18f] hover:text-[#1a241b] transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl border border-[#e2ede4] shadow-xl py-1.5 z-30 animate-in fade-in duration-100">
                          <button
                            onClick={() => {
                              handleStartChatWithContact(contact);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1a241b] hover:bg-[#eff5f0] flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#528d5a]" />
                            <span>Direct Chat</span>
                          </button>
                          <Link
                            to="/dashboard/new-meeting"
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1a241b] hover:bg-[#eff5f0] flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5 text-[#528d5a]" />
                            <span>Invite to Call</span>
                          </Link>
                          <div className="my-1 border-t border-[#e2ede4]" />
                          <button
                            onClick={() => {
                              setContactToDelete(contact);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Remove Contact</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Presence Status Row */}
                  <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-[#e2ede4]/70">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] ${presence.labelClass}`}>
                        {presence.statusText}
                      </span>
                    </div>
                    {contact.note && (
                      <span className="text-[10px] text-[#8ca18f] truncate max-w-[120px]">
                        {contact.note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Quick Action */}
                <div className="mt-4 pt-3 border-t border-[#e2ede4] flex items-center gap-2">
                  <button
                    onClick={() => handleStartChatWithContact(contact)}
                    id={`contact-chat-btn-${contact.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <Link
                    to="/dashboard/new-meeting"
                    className="py-2 px-3 rounded-xl bg-[#f8f9f8] hover:bg-[#eff5f0] text-[#1a241b] border border-[#e2ede4] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Start new video meeting"
                  >
                    <Video className="w-3.5 h-3.5 text-[#528d5a]" />
                    <span>Call</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Contact Modal (Search Real Authenticated Users) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center border border-[#cddfd0]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1a241b] font-['Outfit']">
                    Add Real Firebase Users
                  </h3>
                  <p className="text-xs text-[#5a6b5c]">
                    Search registered members by name or email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-[#eff5f0] text-[#5a6b5c] hover:text-[#1a241b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={userSearchQuery}
                onChange={(e) => handleSearchRegisteredUsers(e.target.value)}
                placeholder="Type email or full name to search..."
                className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>

            {/* Search Results List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {searchingUsers ? (
                <div className="text-center py-8 text-xs text-[#8ca18f] space-y-2">
                  <div className="w-5 h-5 rounded-full border-2 border-[#528d5a] border-t-transparent animate-spin mx-auto" />
                  <p>Searching registered users...</p>
                </div>
              ) : foundUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#5a6b5c] bg-[#f8f9f8] rounded-2xl border border-[#e2ede4] p-4">
                  {userSearchQuery ? (
                    <>
                      <p className="font-semibold text-[#1a241b]">No registered users found</p>
                      <p className="mt-1 text-[#8ca18f]">
                        Make sure the person has signed up with that email address.
                      </p>
                    </>
                  ) : (
                    <p className="text-[#8ca18f]">
                      Type above to search real users registered in the database.
                    </p>
                  )}
                </div>
              ) : (
                foundUsers.map((foundUser) => {
                  const alreadyAdded = isUserInContacts(foundUser.id, foundUser.email);
                  const isAdding = addingUserId === foundUser.id;

                  return (
                    <div
                      key={foundUser.id}
                      className="p-3 rounded-2xl border border-[#e2ede4] hover:bg-[#eff5f0]/50 transition-all flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {foundUser.avatar ? (
                          <img
                            src={foundUser.avatar}
                            alt={foundUser.name}
                            className="w-9 h-9 rounded-xl object-cover border border-[#e2ede4]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-[#eff5f0] text-[#3d6e44] font-bold text-xs font-['Outfit'] border border-[#cddfd0] flex items-center justify-center shrink-0">
                            {getInitials(foundUser.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-[#1a241b] truncate">
                              {foundUser.name}
                            </h4>
                            {foundUser.isOnline && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#5a6b5c] truncate">
                            {foundUser.email}
                          </p>
                        </div>
                      </div>

                      <div>
                        {alreadyAdded ? (
                          <span className="px-3 py-1.5 bg-[#eff5f0] text-[#3d6e44] text-[11px] font-bold rounded-xl border border-[#cddfd0] flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#528d5a]" />
                            <span>Added</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isAdding}
                            onClick={() => handleAddRealUserToContacts(foundUser)}
                            className="px-3.5 py-1.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 disabled:opacity-60 cursor-pointer shadow-xs shadow-[#528d5a]/20"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAdding ? 'Adding...' : 'Add'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#e2ede4] flex items-center justify-between">
              <span className="text-[11px] text-[#8ca18f] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#528d5a]" />
                <span>Verified Firebase Authentication Users</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Contact Confirmation Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Remove from contacts?
              </h3>
              <p className="text-xs text-[#5a6b5c]">
                Are you sure you want to remove <strong className="text-[#1a241b]">"{contactToDelete.name}"</strong>? You can always add them again later.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
