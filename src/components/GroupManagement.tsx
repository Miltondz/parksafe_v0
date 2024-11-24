import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, UserMinus, Settings, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

interface Member {
  id: string;
  email: string;
  role: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useUserStore();

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      if (userGroupsError) throw userGroupsError;

      const groupIds = userGroups.map(g => g.group_id);

      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .in('id', groupIds);

      if (error) throw error;

      const formattedGroups = data.map(group => ({
        ...group,
        member_count: group.group_members[0].count
      }));

      setGroups(formattedGroups);
    } catch (error: any) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          role,
          users:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      const formattedMembers = data.map(member => ({
        id: member.user_id,
        email: member.users.email,
        role: member.role,
        ...member.users
      }));

      setMembers(formattedMembers);
    } catch (error: any) {
      toast.error('Failed to load group members');
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({
        filter: `email.ilike.%${query}%`
      });

      if (error) throw error;

      setSearchResults(users.filter(u => u.id !== user?.id && !members.some(m => m.id === u.id)));
    } catch (error: any) {
      console.error('Error searching users:', error);
      // Fallback to searching in public profiles
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata')
        .ilike('email', `%${query}%`)
        .limit(5);

      if (searchError) throw searchError;
      setSearchResults(data || []);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ name: newGroupName.trim(), created_by: user?.id }])
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{ group_id: group.id, user_id: user?.id, role: 'admin' }]);

      if (memberError) throw memberError;

      toast.success('Group created successfully');
      setGroups([...groups, { ...group, member_count: 1 }]);
      setIsCreating(false);
      setNewGroupName('');
    } catch (error: any) {
      toast.error('Failed to create group');
    }
  };

  const addMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: selectedGroup.id,
          user_id: userId,
          role: 'member'
        }]);

      if (error) throw error;

      toast.success('Member added successfully');
      fetchGroupMembers(selectedGroup.id);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error: any) {
      toast.error('Failed to add member');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', memberId);

      if (error) throw error;

      toast.success('Member removed successfully');
      fetchGroupMembers(selectedGroup.id);
    } catch (error: any) {
      toast.error('Failed to remove member');
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Left group successfully');
      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (error: any) {
      toast.error('Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Groups
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Group
        </button>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Create New Group</h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={createGroup}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{group.name}</h3>
                <p className="text-sm text-gray-500">
                  {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => leaveGroup(group.id)}
                  className="p-2 text-red-500 hover:text-red-700"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No groups available. Create one to get started!
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{selectedGroup.name} Members</h3>
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Search users by email..."
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>

              {searchQuery && searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md divide-y">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-2 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-2">
                        <img
                          src={result.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${result.email}`}
                          alt="Avatar"
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{result.user_metadata?.full_name || result.email}</span>
                      </div>
                      <button
                        onClick={() => addMember(result.id)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <img
                      src={member.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.email}`}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{member.user_metadata?.full_name || member.email}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  {member.id !== user?.id && member.role !== 'admin' && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;