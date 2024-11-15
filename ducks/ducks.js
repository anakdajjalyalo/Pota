const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class DuckClient {
    constructor() {
        this.headers = {
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "origin": "https://app.duckcoop.xyz",
            "referer": "https://app.duckcoop.xyz/",
            "sec-ch-ua": '"Google Chrome";v="116", "Not=A?Brand";v="8", "Chromium";v="116"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "user-agent": "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
        };        
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async login(initData) {
        const url = "https://api.apiduck.xyz/auth/telegram-login";
        
        const parts = new URLSearchParams(initData);
        const user = JSON.parse(decodeURIComponent(parts.get('user')));
        const queryId = parts.get('query_id');
        const authDate = parts.get('auth_date');
        const hash = parts.get('hash');

        const payload = {
            query_id: queryId,
            user: user,
            auth_date: authDate,
            hash: hash,
            referral_code: "B1E4V0ftLS"
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { 
                    success: true, 
                    token: response.data.data.token,
                    userData: response.data.data.user_info
                };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getReward(token) {
        const url = "https://api.apiduck.xyz/reward/get";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCheckinStatus(token) {
        const url = "https://api.apiduck.xyz/checkin/get";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async claimCheckin(token) {
        const url = "https://api.apiduck.xyz/checkin/claim";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.post(url, {}, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getPartnerMissions(token) {
        const url = "https://api.apiduck.xyz/partner-mission/list";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                // Extract all pm_ids where airdrop_info is null
                const eligibleMissions = [];
                response.data.data.data.forEach(partner => {
                    partner.partner_missions.forEach(mission => {
                        if (mission.airdrop_info === null) {
                            eligibleMissions.push({
                                pm_id: mission.pm_id,
                                title: mission.title,
                                reward: mission.reward
                            });
                        }
                    });
                });
                return { success: true, missions: eligibleMissions };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async claimPartnerMission(token, missionId) {
        const url = "https://api.apiduck.xyz/user-partner-mission/claim";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };
        const payload = {
            partner_mission_id: missionId
        };

        try {
            const response = await axios.post(url, payload, { headers });
            return { success: response.data.error_code === "OK" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        this.log('Tool được chia sẻ tại kênh telegram Dân Cày Airdrop (@dancayairdrop)'.green);
    
        const nhiemvu = await this.askQuestion('Bạn có muốn làm nhiệm vụ không? (y/n): ');
        const hoinhiemvu = nhiemvu.toLowerCase() === 'y';
        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                const firstName = userData.first_name;

                console.log(`========== Tài khoản ${i + 1} | ${firstName.green} ==========`);
                
                this.log(`Đang đăng nhập...`, 'info');
                const loginResult = await this.login(initData);
                if (loginResult.success) {
                    this.log('Đăng nhập thành công!', 'success');
                    const token = loginResult.token;

                    const rewardResult = await this.getReward(token);
                    if (rewardResult.success) {
                        this.log(`Total Reward: ${rewardResult.data.total}`, 'success');
                        this.log(`Age: ${rewardResult.data.age}`, 'info');
                        this.log(`Premium: ${rewardResult.data.premium}`, 'info');
                        this.log(`Friends: ${rewardResult.data.friends}`, 'info');
                    } else {
                        this.log(`Không thể lấy thông tin reward: ${rewardResult.error}`, 'error');
                    }

                    const checkinStatus = await this.getCheckinStatus(token);
                    if (checkinStatus.success) {
                        this.log(`Ngày điểm danh hiện tại: ${checkinStatus.data.current_day}`, 'info');
                        this.log(`Số ngày điểm danh liên tiếp: ${checkinStatus.data.current_streak}`, 'info');
                        
                        if (checkinStatus.data.can_claim) {
                            this.log('Có thể điểm danh, đang thực hiện điểm danh...', 'info');
                            const claimResult = await this.claimCheckin(token);
                            if (claimResult.success) {
                                this.log(`Điểm danh thành công, đã điểm danh liên tiếp ${claimResult.data.current_streak} ngày`, 'success');
                            } else {
                                this.log(`Điểm danh thất bại: ${claimResult.error}`, 'error');
                            }
                        } else {
                            this.log('Đã điểm danh hôm nay', 'warning');
                        }
                    } else {
                        this.log(`Không thể kiểm tra trạng thái điểm danh: ${checkinStatus.error}`, 'error');
                    }
                    if (hoinhiemvu) {
                        this.log('Đang kiểm tra nhiệm vụ...', 'info');
                        const missionsResult = await this.getPartnerMissions(token);
                        if (missionsResult.success) {
                            for (const mission of missionsResult.missions) {
                                const claimResult = await this.claimPartnerMission(token, mission.pm_id);
                                if (claimResult.success) {
                                    this.log(`Làm nhiệm vụ ${mission.title} thành công | Phần thưởng: ${mission.reward}`, 'success');
                                }
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } else {
                            this.log(`Không thể lấy danh sách nhiệm vụ: ${missionsResult.error}`, 'error');
                        }
                    }
                } else {
                    this.log(`Đăng nhập không thành công! ${loginResult.error}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(1440 * 60);
        }
    }
}

const client = new DuckClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});