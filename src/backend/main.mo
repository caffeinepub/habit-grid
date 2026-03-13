import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  type Task = {
    id : Text;
    name : Text;
    createdAt : Int;
  };

  module Task {
    public func compare(task1 : Task, task2 : Task) : Order.Order {
      Text.compare(task1.name, task2.name);
    };
  };

  type CompletionKey = {
    taskId : Text;
    date : Text;
  };

  module CompletionKey {
    public func compare(key1 : CompletionKey, key2 : CompletionKey) : Order.Order {
      switch (Text.compare(key1.taskId, key2.taskId)) {
        case (#less) { #less };
        case (#greater) { #greater };
        case (#equal) { Text.compare(key1.date, key2.date) };
      };
    };
  };

  // Persistent data structures
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userTasks = Map.empty<Principal, Map.Map<Text, Task>>();
  let userCompletions = Map.empty<Principal, Set.Set<CompletionKey>>();

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Task Management
  public shared ({ caller }) func addTask(id : Text, name : Text, createdAt : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add tasks");
    };

    let task : Task = { id; name; createdAt };

    let tasks = switch (userTasks.get(caller)) {
      case (null) {
        let newTasks = Map.empty<Text, Task>();
        newTasks.add(id, task);
        newTasks;
      };
      case (?tasks) {
        tasks.add(id, task);
        tasks;
      };
    };

    userTasks.add(caller, tasks);
  };

  public shared ({ caller }) func deleteTask(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete tasks");
    };

    switch (userTasks.get(caller)) {
      case (null) { Runtime.trap("Task not found") };
      case (?tasks) {
        tasks.remove(id);
        userTasks.add(caller, tasks);
      };
    };
  };

  public shared ({ caller }) func renameTask(id : Text, newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rename tasks");
    };

    switch (userTasks.get(caller)) {
      case (null) { Runtime.trap("Task not found") };
      case (?tasks) {
        switch (tasks.get(id)) {
          case (null) { Runtime.trap("Task not found") };
          case (?task) {
            tasks.add(id, { task with name = newName });
            userTasks.add(caller, tasks);
          };
        };
      };
    };
  };

  public query ({ caller }) func getTasks() : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get tasks");
    };

    switch (userTasks.get(caller)) {
      case (null) { [] };
      case (?tasks) {
        tasks.values().toArray().sort();
      };
    };
  };

  // Completion Management
  public shared ({ caller }) func setCompletion(taskId : Text, date : Text, completed : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set completions");
    };

    let key = { taskId; date };

    let completions = switch (userCompletions.get(caller)) {
      case (null) {
        let newCompletions = Set.empty<CompletionKey>();
        if (completed) {
          newCompletions.add(key);
        };
        newCompletions;
      };
      case (?completions) {
        if (completed) {
          completions.add(key);
        } else {
          completions.remove(key);
        };
        completions;
      };
    };

    userCompletions.add(caller, completions);
  };

  public query ({ caller }) func getCompletions() : async [(Text, Text)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get completions");
    };

    switch (userCompletions.get(caller)) {
      case (null) { [] };
      case (?completions) {
        completions.toArray().map(
          func(key) { (key.taskId, key.date) }
        );
      };
    };
  };
};
