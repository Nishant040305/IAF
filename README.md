# VayuReader Project

This project is a comprehensive platform for secure PDF management, content discovery, and administration. It consists of a robust backend, web-based admin dashboard, and a mobile application.
It aims to provide protection from every sort of attack and with scalability there are two branch which we would focus on 

1. Deployment Branch : Suppose to provide the best facility to make user experience better and and provide ms of latency with high throuput.
2. Encrypted Branch: Suppose to provide security in a sense it compromises the performance to provide the security assuming constant threats on the application
   and with it being most valuable information on the site.

Q: Why to seperate them?
A: With miliseconds of performance with minimilistic resources its practically everything lands to High Network latency and small case systems
   along with nodejs server which is not that scalable at all. Not when you need protection from MITM and in flight tampering of request.

Q: Why to choose nodejs
A: No body should in case you plan to server such a large network with few resource its not scalable because of single thread and un typed system, but since the original code was written in nodejs
   even after considering bad option. The best development speed is always offered by nodejs

Q: What branch I should use?
A: Depends on your usecase suggestion for any normal user you can go for deployment branch as this branch will have more updates and optimization to save your deployment cost and memory usage along with cpu
   utilisation, but for security as a main issue you can go with Encrypted branch.

Q: Should we use the original code since its a fork?
A: Yes, Its a fork but of a dead code base with -ve sense architecture with 0 scalability and reliablity as the complete frontend - backend is rewritten, only apk is not modified as its UI is loved by many though I
   dont like it at all whole design is very poor but thats the only part where only small tweeks were done

Q: Can you contribute?
A: Thats why its public but improving backend would be admired , UI have some practical flaw and have lazy implementation if you are intreasted to add u can do that too. like allowing user with no authority in admin-dashboard
   must be able to see pdfs , Dictionary and Abbreviation. These things are supposed to be public and UI just does not but it does not mean he should'nt see they are suppose to see but due to lazy coding it is as it is so would always
   appriciate open source contribution.
   
Encrypted Branch: What makes it special.

1. E2E encryption: AES-GSM encryption with session based key generation.
2. E2E signature: Since its not practical to encrypt pdf files as that would cost too much cpu resource making complete application slow, solution is to use a one time signature which can be used so that
   Replay attack and mid flight File tampering can be defended
3. Note: Only PDF upload is supported and for some reference the json upload and csv upload are not actually csv and json upload , The input is parsed on the frontend with filters to detect any kind of Injection or scrip itself and converted into     a json payload Not a file then that is converted into string stream and then encrypted with Encryption Key then that was sent and then decrypted at Backend then verify the text does not contain any malicious code then it was saved in mongodb       which already does not support xlxs formula support.
4. PDF file stream is also parsed to verify that it does not contain any script along with mime type checks and SHA hash verification.

Deployment Branch: What makes this special

1. It realy on TLS of https only hence a Defihelman attack is possible and a intermidate proxy can be setup which adding self signed certificates in the client OS certificate collection
2. What ensures server response to correct users and authority. Does not guarentee the UI tweeks as changing the live variable is always possible using dev tools.
3. It consider the validity of token upto its expiry so as it aims for longer use of application by customer
4. It utilises caching very well as since there is no encryption nginx can serve pages cache and cache hit does not need to go cycle of encryption.
5. It aims to provide speed over all the short commings. Made for mass user base (not admin)
6. Future Addition , use of OLAP db for analytics like Clickhouse; batching actions; CDN configurations for faster delivery; hot key handle for scale write and read replica; and postgres as main server

How to proceed:

check the [book](https://github.com/Nishant040305/vayureader/tree/Encrypted/vayureader/docs/pdf_output)
for short [guide](https://github.com/Nishant040305/vayureader/blob/Encrypted/vayureader/docs/setup.md)
some document updates required to be done as it includes the latest changes and commits and change in the plan a new documentation style would be opted.
currently the information that the docs is supposed to include can be refered from this README.md file

you can refer to vayureader/docs/output/book.pdf book contains all the information about the project

Current Versions:
Nginx: 1.25-alpine
redis: 7.2-alpine
mongo: 6-jammy
elasticsearch: 8.11.0
node: 20-alpine
react: ^19.0.1
react-native: 0.79.3
expo: ~53.0.10
rest of library info can be verified from the package.json file of backend and frontend and admin dashboard

